"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, getBrand } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { sendConfirmation, handleOptionTap } from "@/lib/flow";
import { launchCampaign } from "@/lib/campaigns";
import { login as doLogin, logout as doLogout } from "@/lib/auth";
import { ORDER_STATUS } from "@/lib/constants";

// ---- auth ----
export async function loginAction(formData: FormData) {
  const ok = await doLogin(String(formData.get("password") || ""));
  if (ok) redirect("/");
  redirect("/login?error=1");
}
export async function logoutAction() {
  await doLogout();
  redirect("/login");
}

// ---- settings ----
export async function saveSettings(formData: FormData) {
  const brand = await getBrand();
  const wantsLive = formData.get("mock") !== "on";
  const phoneNumberId = String(formData.get("phoneNumberId") || "");
  const appSecret = String(formData.get("appSecret") || "");
  const newToken = String(formData.get("accessToken") || "");
  const hasToken = Boolean(newToken || brand.accessToken);

  // Only allow going live when all three live-mode credentials are present —
  // otherwise force mock mode so sends can't silently fail.
  const canGoLive = Boolean(phoneNumberId && appSecret && hasToken);
  const mock = wantsLive ? !canGoLive : true;

  await prisma.brand.update({
    where: { id: brand.id },
    data: {
      name: String(formData.get("name") || brand.name),
      whatsappNumber: String(formData.get("whatsappNumber") || ""),
      mock,
      waMode: mock ? "mock" : "meta",
      phoneNumberId,
      appSecret,
      verifyToken: String(formData.get("verifyToken") || "") || brand.verifyToken || randomToken(),
      ...(newToken ? { accessToken: newToken } : {}),
    },
  });
  revalidatePath("/settings");
}

function randomToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// ---- message template ----
export async function saveTemplate(formData: FormData) {
  const brand = await getBrand();
  const template = await prisma.messageTemplate.upsert({
    where: { brandId: brand.id },
    create: {
      brandId: brand.id,
      header: str(formData, "header"),
      body: str(formData, "body"),
      sectionTitle: str(formData, "sectionTitle"),
      buttonText: str(formData, "buttonText"),
    },
    update: {
      header: str(formData, "header"),
      body: str(formData, "body"),
      sectionTitle: str(formData, "sectionTitle"),
      buttonText: str(formData, "buttonText"),
    },
  });

  // Replace options from the repeated fields opt_label[], opt_tag[], opt_reply[], opt_action[].
  const labels = formData.getAll("opt_label").map(String);
  const tags = formData.getAll("opt_tag").map(String);
  const replies = formData.getAll("opt_reply").map(String);
  const actions = formData.getAll("opt_action").map(String);

  await prisma.messageOption.deleteMany({ where: { templateId: template.id } });
  for (let i = 0; i < labels.length; i++) {
    if (!labels[i].trim()) continue;
    await prisma.messageOption.create({
      data: {
        templateId: template.id,
        position: i,
        label: labels[i].slice(0, 24),
        orderTag: tags[i] || "",
        responseMessage: replies[i] || "",
        action: actions[i] || "custom",
      },
    });
  }
  revalidatePath("/message");
}

function str(fd: FormData, k: string) {
  return String(fd.get(k) || "");
}

// ---- orders ----
export async function createOrder(formData: FormData) {
  const brand = await getBrand();
  const phone = normalizePhone(String(formData.get("phone") || ""));
  if (!phone) return;
  const name = String(formData.get("name") || "Customer");
  const total = parseFloat(String(formData.get("total") || "0")) || 0;

  const customer = await prisma.customer.upsert({
    where: { brandId_phone: { brandId: brand.id, phone } },
    create: { brandId: brand.id, phone, name, optIn: true },
    update: { name },
  });
  const seq = (await prisma.order.count({ where: { brandId: brand.id } })) + 1001;
  const order = await prisma.order.create({
    data: {
      brandId: brand.id,
      customerId: customer.id,
      externalId: String(seq),
      total,
      status: ORDER_STATUS.RECEIVED,
    },
  });
  revalidatePath("/");
  redirect(`/orders/${order.id}`);
}

export async function sendConfirmationAction(formData: FormData) {
  const id = Number(formData.get("orderId"));
  try {
    await sendConfirmation(id);
    await prisma.order.update({ where: { id }, data: { lastError: "" } });
  } catch (e) {
    // Show the provider's message in the UI instead of crashing the page.
    await prisma.order.update({ where: { id }, data: { lastError: String((e as Error).message || e) } });
  }
  revalidatePath(`/orders/${id}`);
}

export async function tapOptionAction(formData: FormData) {
  const id = Number(formData.get("orderId"));
  const rowId = String(formData.get("rowId"));
  // Record the inbound tap in the transcript, then run the SAME handler the
  // webhook uses.
  const order = await prisma.order.findUniqueOrThrow({ where: { id }, include: { customer: true } });
  await prisma.messageLog.create({
    data: {
      brandId: order.brandId,
      orderId: id,
      phone: order.customer.phone,
      direction: "in",
      kind: "tap",
      body: String(formData.get("label") || rowId),
    },
  });
  await handleOptionTap(id, rowId);
  revalidatePath(`/orders/${id}`);
}

// ---- customers ----
export async function toggleOptIn(formData: FormData) {
  const id = Number(formData.get("customerId"));
  const c = await prisma.customer.findUniqueOrThrow({ where: { id } });
  await prisma.customer.update({
    where: { id },
    data: { optIn: !c.optIn, optedOutAt: c.optIn ? new Date() : null },
  });
  revalidatePath("/customers");
}

// ---- campaigns ----
export async function createCampaign(formData: FormData) {
  const brand = await getBrand();
  const c = await prisma.campaign.create({
    data: {
      brandId: brand.id,
      name: String(formData.get("name") || "Campaign"),
      body: String(formData.get("body") || ""),
    },
  });
  revalidatePath("/campaigns");
  redirect(`/campaigns?sent=${c.id}`);
}

export async function sendCampaign(formData: FormData) {
  const id = Number(formData.get("campaignId"));
  try {
    await launchCampaign(id);
  } catch {
    await prisma.campaign.update({ where: { id }, data: { status: "draft" } });
  }
  revalidatePath("/campaigns");
}

// ---- own-number (Baileys) connection ----
export async function connectOwnNumber() {
  const brand = await getBrand();
  await prisma.brand.update({ where: { id: brand.id }, data: { waMode: "baileys", mock: false } });
  const { startWa } = await import("@/lib/baileys");
  await startWa(); // begins the session; QR appears via /api/wa/status
  revalidatePath("/settings");
}

export async function disconnectOwnNumber() {
  const brand = await getBrand();
  const { logoutWa } = await import("@/lib/baileys");
  await logoutWa();
  await prisma.brand.update({ where: { id: brand.id }, data: { waMode: "mock", mock: true } });
  revalidatePath("/settings");
}

// ---- demo ----
export async function seedDemo() {
  const brand = await getBrand();
  await prisma.messageTemplate.upsert({
    where: { brandId: brand.id },
    create: {
      brandId: brand.id,
      header: "Order Confirmation Required",
      body: "Thank You {firstName} 🎉\n\nWe appreciate your trust in {shopName}! Your order {orderNumber} ({total} {currency}) is being processed and will be delivered within 2-4 working days. 🚚",
      sectionTitle: "Order Confirmation",
      buttonText: "Select Payment",
    },
    update: {},
  });
  const t = await prisma.messageTemplate.findUniqueOrThrow({ where: { brandId: brand.id } });
  const count = await prisma.messageOption.count({ where: { templateId: t.id } });
  if (count === 0) {
    await prisma.messageOption.createMany({
      data: [
        { templateId: t.id, position: 0, label: "✅ Pay with Instapay", orderTag: "Shipping Payed with instapay", action: "confirm", responseMessage: "🔹 Instapay: https://ipn.eg/S/ziadalicib/instapay/44740t" },
        { templateId: t.id, position: 1, label: "✅ Pay with Vodafone Cash", orderTag: "Shipping Payed with Vodafone Cash", action: "confirm", responseMessage: "🔹 Vodafone Cash: 01005752573" },
        { templateId: t.id, position: 2, label: "❌ Cancel order", orderTag: "Cancelled", action: "cancel", responseMessage: "تم إلغاء طلبك." },
      ],
    });
  }
  if (!brand.whatsappNumber) {
    await prisma.brand.update({ where: { id: brand.id }, data: { name: "Demo Store", whatsappNumber: "+201505626767" } });
  }
  // a sample order
  const phone = "+201000001001";
  const customer = await prisma.customer.upsert({
    where: { brandId_phone: { brandId: brand.id, phone } },
    create: { brandId: brand.id, phone, name: "Test Customer", optIn: true },
    update: {},
  });
  const seq = (await prisma.order.count({ where: { brandId: brand.id } })) + 1001;
  await prisma.order.create({
    data: { brandId: brand.id, customerId: customer.id, externalId: String(seq), total: 500, status: "received" },
  });
  revalidatePath("/");
}

export async function resetDemo() {
  const brand = await getBrand();
  await prisma.order.deleteMany({ where: { brandId: brand.id } });
  await prisma.messageLog.deleteMany({ where: { brandId: brand.id } });
  await prisma.customer.deleteMany({ where: { brandId: brand.id } });
  revalidatePath("/");
}
