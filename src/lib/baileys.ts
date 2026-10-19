// Baileys (WhatsApp Web, multi-device) session manager — the "send from your
// own number" path. Holds ONE socket in the Node process (Railway runs a single
// always-on container), persists auth in the DB, exposes the QR for linking, and
// routes inbound replies into the order flow.
//
// NOTE: this is the unofficial method. Interactive list/button messages are
// unreliable on WhatsApp Web sessions, so confirmations go out as a numbered
// text menu ("reply 1 / 2") and inbound digits are matched back to options.
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import QRCode from "qrcode";
import { loadPrismaAuthState, clearAuthState } from "./wa-auth";

type Status = "disconnected" | "connecting" | "qr" | "connected";

type WaState = {
  sock: WASocket | null;
  status: Status;
  qrDataUrl: string | null;
  starting: Promise<void> | null;
  me: string | null;
};

// Survive Next.js hot-reloads in dev.
const g = globalThis as unknown as { __wa?: WaState; __waSigterm?: boolean };
const wa: WaState = (g.__wa ??= {
  sock: null,
  status: "disconnected",
  qrDataUrl: null,
  starting: null,
  me: null,
});

const logger = pino({ level: "silent" });

export function waStatus() {
  return { status: wa.status, qrDataUrl: wa.qrDataUrl, me: wa.me };
}

/** Start (or reuse) the socket. Safe to call repeatedly. */
export async function startWa(): Promise<void> {
  if (wa.status === "connected" || wa.status === "connecting" || wa.status === "qr") return;
  if (wa.starting) return wa.starting;
  wa.starting = connect().finally(() => (wa.starting = null));
  return wa.starting;
}

async function connect(): Promise<void> {
  wa.status = "connecting";
  const { state, saveCreds } = await loadPrismaAuthState();
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({ version, auth: state, logger, printQRInTerminal: false });
  wa.sock = sock;

  // On container shutdown (Railway sends SIGTERM before killing), close the
  // socket cleanly instead of letting it drop — avoids a dirty takeover.
  if (!g.__waSigterm) {
    g.__waSigterm = true;
    process.once("SIGTERM", () => {
      try {
        wa.sock?.end(undefined);
      } catch {
        /* ignore */
      }
    });
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) {
      wa.status = "qr";
      wa.qrDataUrl = await QRCode.toDataURL(qr);
    }
    if (connection === "open") {
      wa.status = "connected";
      wa.qrDataUrl = null;
      wa.me = sock.user?.id?.split(":")[0]?.split("@")[0] ?? null;
    }
    if (connection === "close") {
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      wa.status = "disconnected";
      wa.sock = null;
      if (code === DisconnectReason.loggedOut) {
        // User unlinked the device — drop the stored session.
        await clearAuthState();
        wa.me = null;
      } else if (code === DisconnectReason.connectionReplaced) {
        // Another container took over this session (happens during a Railway
        // redeploy, which starts the new container before stopping the old).
        // Do NOT reconnect, or the two fight in a loop and corrupt the session.
        console.log("WA connection replaced by another instance — standing down.");
      } else {
        // Includes restartRequired (515), which fires right after a scan.
        setTimeout(() => startWa().catch(() => {}), 3000);
      }
    }
  });

  // Inbound messages -> order flow.
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const m of messages) {
      if (m.key.fromMe || !m.message) continue;
      const jid = m.key.remoteJid || "";
      // WhatsApp sometimes delivers from an @lid id instead of the phone jid;
      // fall back to the key's phone-number fields when that happens.
      const key = m.key as { remoteJid?: string; remoteJidAlt?: string; senderPn?: string };
      let fromJid = jid;
      if (jid.endsWith("@lid")) fromJid = key.senderPn || key.remoteJidAlt || jid;
      const from = fromJid.split("@")[0].split(":")[0];
      console.log("WA inbound from jid=%s resolved=%s", jid, from); // first real test decides @lid handling
      const text =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        m.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
        m.message.buttonsResponseMessage?.selectedButtonId ||
        "";
      if (!from || !/^\d/.test(from) || !text) continue;
      // Lazy import to avoid a circular module load at startup.
      const { handleInboundReply } = await import("./flow");
      await handleInboundReply(from, text.trim()).catch((e) =>
        console.error("inbound handling failed:", e)
      );
    }
  });
}

/** Send a plain text message to an E.164 number (no +). */
export async function waSendText(toE164: string, text: string): Promise<string> {
  if (!wa.sock || wa.status !== "connected") throw new Error("WhatsApp not connected — scan the QR in Settings");
  const jid = `${toE164.replace(/^\+/, "")}@s.whatsapp.net`;
  const sent = await wa.sock.sendMessage(jid, { text });
  return sent?.key?.id || "";
}

export async function logoutWa(): Promise<void> {
  try {
    await wa.sock?.logout();
  } catch {
    /* ignore */
  }
  await clearAuthState();
  wa.sock = null;
  wa.status = "disconnected";
  wa.qrDataUrl = null;
  wa.me = null;
}
