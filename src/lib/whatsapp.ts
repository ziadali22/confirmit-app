// WhatsApp transport: mock (logs + records transcript) or Meta Cloud API.
// The brand row decides which: brand.mock === true => mock.

import { prisma } from "./db";
import { normalizePhone } from "./phone";
import { numberedMenu, type RenderedMessage } from "./messaging";

const GRAPH = "https://graph.facebook.com/v21.0";

type Brand = {
  id: number;
  mock: boolean;
  waMode?: string; // "mock" | "baileys" | "meta"
  accessToken: string;
  phoneNumberId: string;
};

function modeOf(brand: Brand): string {
  return brand.waMode || (brand.mock ? "mock" : "meta");
}

async function logOut(
  brandId: number,
  orderId: number | null,
  phone: string,
  body: string,
  kind: string,
  options: { rowId: string; label: string; tag?: string; response?: string; action?: string }[] = []
) {
  await prisma.messageLog.create({
    data: {
      brandId,
      orderId: orderId ?? undefined,
      phone,
      direction: "out",
      kind,
      body,
      options: JSON.stringify(options),
    },
  });
}

async function metaPost(brand: Brand, payload: unknown): Promise<string> {
  const res = await fetch(`${GRAPH}/${brand.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${brand.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `WhatsApp send failed (${res.status})`);
  }
  return data?.messages?.[0]?.id ?? "";
}

/** Send the interactive list message. Returns the provider message id. */
export async function sendListMessage(
  brand: Brand,
  orderId: number | null,
  to: string,
  msg: RenderedMessage
): Promise<string> {
  const phone = normalizePhone(to);
  // Snapshot the FULL options as sent, so later template edits don't break the
  // meaning of a tap on an already-delivered message.
  const optionMeta = msg.options.map((o) => ({
    rowId: o.rowId,
    label: o.label,
    tag: o.tag,
    response: o.response,
    action: o.action,
  }));

  const mode = modeOf(brand);

  if (mode === "mock") {
    const id = `mock-${Date.now()}`;
    await logOut(brand.id, orderId, phone, msg.body, "confirmation", optionMeta);
    return id;
  }

  if (mode === "baileys") {
    // Own-number path: buttons don't render, so send a numbered text menu.
    const { waSendText } = await import("./baileys");
    const id = await waSendText(phone, numberedMenu(msg));
    await logOut(brand.id, orderId, phone, msg.body, "confirmation", optionMeta);
    return id;
  }

  const rows = msg.options.map((o) => ({ id: o.rowId, title: o.label.slice(0, 24) }));
  const interactive: Record<string, unknown> = {
    type: "list",
    body: { text: msg.body },
    action: {
      button: (msg.buttonText || "Select").slice(0, 20),
      sections: [{ title: (msg.sectionTitle || "Options").slice(0, 24), rows }],
    },
  };
  if (msg.header) interactive.header = { type: "text", text: msg.header.slice(0, 60) };

  const id = await metaPost(brand, {
    messaging_product: "whatsapp",
    to: phone.replace(/^\+/, ""),
    type: "interactive",
    interactive,
  });
  await logOut(brand.id, orderId, phone, msg.body, "confirmation", optionMeta);
  return id;
}

/** Send a plain text reply (option response, payment link, etc.). */
export async function sendText(
  brand: Brand,
  orderId: number | null,
  to: string,
  text: string,
  kind = "reply"
): Promise<string> {
  const phone = normalizePhone(to);
  const mode = modeOf(brand);
  if (mode === "mock") {
    const id = `mock-${Date.now()}`;
    await logOut(brand.id, orderId, phone, text, kind);
    return id;
  }
  if (mode === "baileys") {
    const { waSendText } = await import("./baileys");
    const id = await waSendText(phone, text);
    await logOut(brand.id, orderId, phone, text, kind);
    return id;
  }
  const id = await metaPost(brand, {
    messaging_product: "whatsapp",
    to: phone.replace(/^\+/, ""),
    type: "text",
    text: { body: text },
  });
  await logOut(brand.id, orderId, phone, text, kind);
  return id;
}

// --- inbound parsing ------------------------------------------------------
export type InboundReply = {
  from: string;          // normalized E.164
  contextId: string;     // id of the message being replied to
  optionId: string;      // tapped list row id (opt_<n>) if any
  text: string;
};

type WaReply = { id?: string; title?: string };
type WaMessage = {
  from?: string;
  context?: { id?: string };
  interactive?: { list_reply?: WaReply; button_reply?: WaReply };
  button?: { payload?: string; text?: string }; // template quick-reply taps
  text?: { body?: string };
};
type WaWebhook = { entry?: { changes?: { value?: { messages?: WaMessage[] } }[] }[] };

/** Parse a Meta webhook body into a reply, or null if it isn't a user message. */
export function parseInbound(body: unknown): InboundReply | null {
  try {
    const value = (body as WaWebhook).entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    if (!msg) return null; // statuses / delivery receipts have no messages[]
    const listReply = msg.interactive?.list_reply ?? {};
    const buttonReply = msg.interactive?.button_reply ?? {};
    // Interactive list/button replies carry our opt_<n> id; approved-template
    // quick-reply buttons arrive as msg.button.payload instead.
    const optionId = listReply.id || buttonReply.id || msg.button?.payload || "";
    return {
      from: normalizePhone(msg.from || ""),
      contextId: msg.context?.id || "",
      optionId,
      text: msg.text?.body || listReply.title || buttonReply.title || msg.button?.text || "",
    };
  } catch {
    return null;
  }
}
