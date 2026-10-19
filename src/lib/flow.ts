// The automation engine: send a confirmation, and resolve an order when the
// customer taps a list option (apply the tag, send the reply, set the status).
// Deliberately NOT chaining a payment upsell after a tap — the option's own
// response message carries the payment link, which is what the merchant wrote.

import { prisma } from "./db";
import { ORDER_STATUS, OPTION_ACTION } from "./constants";
import { renderMessage, render, contextFor } from "./messaging";
import { sendListMessage, sendText } from "./whatsapp";

const REMINDER_HOURS = 6;

export async function loadOrder(orderId: number) {
  return prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      customer: true,
      brand: { include: { template: { include: { options: true } } } },
    },
  });
}

/** Send the configured confirmation list message for an order. */
export async function sendConfirmation(orderId: number) {
  const order = await loadOrder(orderId);
  if (!order.brand.template) throw new Error("No message template configured");

  const msg = renderMessage(order, order.brand.template);
  const messageId = await sendListMessage(order.brand, order.id, order.customer.phone, msg);

  await prisma.confirmation.create({
    data: { orderId: order.id, channel: "whatsapp", providerMessageId: messageId },
  });
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: ORDER_STATUS.CONFIRMING,
      lastWaMessageId: messageId,
      nextActionAt: new Date(Date.now() + REMINDER_HOURS * 3600_000),
      reminded: false,
    },
  });
  return messageId;
}

/**
 * Customer tapped a list row (via webhook or the test simulator).
 * `rowId` is like "opt_5". Applies tag + reply + action.
 */
type TappedOption = { label: string; orderTag: string; responseMessage: string; action: string };

/** Resolve a tapped row from the snapshot stored when the message was sent,
 *  falling back to the current template (older logs / defaults). */
async function resolveTappedOption(orderId: number, rowId: string): Promise<TappedOption | null> {
  const log = await prisma.messageLog.findFirst({
    where: { orderId, direction: "out", kind: "confirmation" },
    orderBy: { id: "desc" },
  });
  if (log) {
    const opts = JSON.parse(log.options || "[]") as {
      rowId: string; label?: string; tag?: string; response?: string; action?: string;
    }[];
    const snap = opts.find((o) => o.rowId === rowId);
    if (snap && (snap.tag !== undefined || snap.response !== undefined || snap.action !== undefined)) {
      return {
        label: snap.label || "",
        orderTag: snap.tag || "",
        responseMessage: snap.response || "",
        action: snap.action || "custom",
      };
    }
  }
  const optId = Number(rowId.replace("opt_", ""));
  const order = await loadOrder(orderId);
  const live = order.brand.template?.options.find((o) => o.id === optId);
  return live
    ? { label: live.label, orderTag: live.orderTag, responseMessage: live.responseMessage, action: live.action }
    : null;
}

export async function handleOptionTap(orderId: number, rowId: string) {
  const order = await loadOrder(orderId);
  const option = await resolveTappedOption(orderId, rowId);
  if (!option) return;

  // 1) Persist all state FIRST, so a later send failure can't leave the order
  //    stuck (and can't cause a webhook retry to reprocess an unresolved order).
  const tags: string[] = JSON.parse(order.tags || "[]");
  if (option.orderTag && !tags.includes(option.orderTag)) tags.push(option.orderTag);

  const outcome =
    option.action === OPTION_ACTION.CONFIRM
      ? "confirm"
      : option.action === OPTION_ACTION.CANCEL
      ? "cancel"
      : "pending";
  const status =
    option.action === OPTION_ACTION.CONFIRM
      ? ORDER_STATUS.CONFIRMED
      : option.action === OPTION_ACTION.CANCEL
      ? ORDER_STATUS.CANCELLED
      : order.status;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      tags: JSON.stringify(tags),
      status,
      ...(option.action === OPTION_ACTION.CANCEL ? { cancelReason: option.label } : {}),
      ...(option.action !== OPTION_ACTION.CUSTOM ? { nextActionAt: null } : {}),
    },
  });
  await prisma.confirmation.updateMany({
    where: { orderId: order.id, channel: "whatsapp" },
    data: { outcome, repliedAt: new Date() },
  });

  // 2) Send the configured reply as a best-effort step — never let it throw out
  //    of the handler (a provider hiccup must not trigger a Meta webhook retry).
  if (option.responseMessage) {
    try {
      const text = render(option.responseMessage, contextFor(order));
      await sendText(order.brand, order.id, order.customer.phone, text, "reply");
    } catch (e) {
      console.error("reply send failed (state already saved):", e);
    }
  }
}

/**
 * Inbound reply from the customer (Baileys own-number path). `text` is what they
 * typed; a leading digit selects the option by position in the sent menu.
 */
export async function handleInboundReply(fromPhone: string, text: string) {
  const phone = fromPhone.startsWith("+") ? fromPhone : `+${fromPhone}`;
  const order = await prisma.order.findFirst({
    where: { status: ORDER_STATUS.CONFIRMING, customer: { phone } },
    orderBy: { id: "desc" },
  });
  if (!order) return;

  await prisma.messageLog.create({
    data: { brandId: order.brandId, orderId: order.id, phone, direction: "in", kind: "reply", body: text },
  });

  // Map the reply to a row id from what was actually sent.
  const log = await prisma.messageLog.findFirst({
    where: { orderId: order.id, direction: "out", kind: "confirmation" },
    orderBy: { id: "desc" },
  });
  const opts = JSON.parse(log?.options || "[]") as { rowId: string; label?: string }[];
  if (!opts.length) return;

  // Normalize Arabic-Indic (٠-٩) and Eastern-Arabic (۰-۹) digits to ASCII, since
  // the number is also used for normal chats and customers may type either.
  const normalized = text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

  let chosen: { rowId: string } | undefined;
  const digit = normalized.match(/^\s*(\d{1,2})\s*$/); // ONLY a bare number selects
  if (digit) {
    chosen = opts[Number(digit[1]) - 1];
  } else {
    // Exact label match only — a loose "includes" would match stray chat text.
    const t = normalized.trim().toLowerCase();
    chosen = opts.find((o) => (o.label || "").trim().toLowerCase() === t);
  }
  if (chosen) await handleOptionTap(order.id, chosen.rowId);
}

/**
 * Scheduler tick — run from /api/cron (works on Railway cron and Cloudflare Cron
 * Triggers). Sends one reminder to orders still awaiting a reply past their
 * nextActionAt. No in-memory timers, so it survives restarts.
 */
export async function runDueJobs(now = new Date()) {
  const due = await prisma.order.findMany({
    where: { status: ORDER_STATUS.CONFIRMING, reminded: false, nextActionAt: { lte: now } },
    include: { customer: true, brand: true },
  });
  for (const order of due) {
    await sendText(
      order.brand,
      order.id,
      order.customer.phone,
      "⏰ Just a reminder — please confirm your order so we can ship it.",
      "reminder"
    );
    await prisma.order.update({ where: { id: order.id }, data: { reminded: true, nextActionAt: null } });
  }
  return due.length;
}
