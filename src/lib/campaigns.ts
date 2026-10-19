import { prisma } from "./db";
import { render } from "./messaging";
import { sendText } from "./whatsapp";

/** Send a campaign to every opted-in customer. Respects opt-out at send time. */
export async function launchCampaign(campaignId: number) {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { brand: true },
  });
  await prisma.campaign.update({ where: { id: campaignId }, data: { status: "sending" } });

  const audience = await prisma.customer.findMany({
    where: { brandId: campaign.brandId, optIn: true, optedOutAt: null },
  });

  // Don't re-message anyone already sent (guards against a double "Send now").
  const alreadySent = new Set(
    (await prisma.campaignRecipient.findMany({
      where: { campaignId, status: "sent" },
      select: { customerId: true },
    })).map((r) => r.customerId)
  );

  // On the own-number path, pace sends (randomized) — back-to-back bulk from a
  // personal number is the fastest way to get it banned.
  const paced = (campaign.brand.waMode || (campaign.brand.mock ? "mock" : "meta")) === "baileys";
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (const customer of audience) {
    if (alreadySent.has(customer.id)) continue;
    if (paced) await sleep(3000 + Math.floor(Math.random() * 7000)); // 3–10s
    const first = (customer.name || "").trim().split(" ")[0] || "";
    const text = render(campaign.body, { firstName: first, shopName: campaign.brand.name });
    try {
      const messageId = await sendText(campaign.brand, null, customer.phone, text, "campaign");
      await prisma.campaignRecipient.upsert({
        where: { campaignId_customerId: { campaignId, customerId: customer.id } },
        create: { campaignId, customerId: customer.id, status: "sent", messageId, sentAt: new Date() },
        update: { status: "sent", messageId, sentAt: new Date() },
      });
    } catch (e) {
      await prisma.campaignRecipient.upsert({
        where: { campaignId_customerId: { campaignId, customerId: customer.id } },
        create: { campaignId, customerId: customer.id, status: "failed", error: String(e) },
        update: { status: "failed", error: String(e) },
      });
    }
  }
  await prisma.campaign.update({ where: { id: campaignId }, data: { status: "sent" } });
  return audience.length;
}
