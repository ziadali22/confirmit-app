// Store of outbound WhatsApp message bodies, keyed by WhatsApp message id.
//
// Why this exists: when a recipient can't decrypt a message (their Signal
// session with us drifted), their phone doesn't just give up — it sends a
// *retry receipt* asking us to re-encrypt and send it again. Baileys answers
// that receipt by calling `getMessage(key)` to look up what we originally sent.
// With no store it returns undefined, Baileys logs "recv retry request, but
// message not available", and the recipient sits on "Waiting for this message.
// This may take a while." forever.
//
// The store has to be in the DB, not memory: the retry receipt often arrives
// after a redeploy, which is exactly when an in-process cache is empty.
import { proto } from "@whiskeysockets/baileys";
import { prisma } from "./db";

// WhatsApp stops retrying long before this; the window only needs to outlive a
// redeploy plus the recipient's retry attempts.
const RETENTION_DAYS = 7;

/** Remember what we sent, so a later retry receipt can be answered. */
export async function rememberSentMessage(
  id: string,
  jid: string,
  message: proto.IMessage,
  fallbackText: string
): Promise<void> {
  let content: string;
  try {
    content = JSON.stringify(message);
  } catch {
    // Protobuf objects normally serialize cleanly for text messages; if one
    // doesn't, a plain conversation carries the same words to the recipient.
    content = JSON.stringify({ conversation: fallbackText });
  }
  try {
    await prisma.waSentMessage.upsert({
      where: { id },
      create: { id, jid, content },
      update: { jid, content },
    });
  } catch (e) {
    // Never fail a send because the retry-store write failed — the message is
    // already out. Worst case we can't answer a retry receipt for this one.
    console.error("WA: could not store sent message for retry:", e);
  }
}

/** Look up a message we sent earlier, for Baileys to re-encrypt and resend. */
export async function getSentMessage(id: string): Promise<proto.IMessage | undefined> {
  try {
    const row = await prisma.waSentMessage.findUnique({ where: { id } });
    if (!row) return undefined;
    return JSON.parse(row.content) as proto.IMessage;
  } catch (e) {
    console.error("WA: could not load sent message for retry:", e);
    return undefined;
  }
}

/** Drop bodies past the retention window. Called opportunistically on connect. */
export async function pruneSentMessages(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  try {
    const { count } = await prisma.waSentMessage.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (count) console.log("WA: pruned %d stored message bodies", count);
  } catch (e) {
    console.error("WA: prune of stored messages failed:", e);
  }
}
