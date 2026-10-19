// Runs once when the server starts. If the brand uses the own-number (Baileys)
// mode and a linked session already exists in the DB, reconnect it so sending
// works immediately after a redeploy — no re-scanning the QR.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { prisma } = await import("@/lib/db");
    const brand = await prisma.brand.findFirst();
    const hasSession = await prisma.waSession.findUnique({ where: { key: "creds" } });
    if (brand?.waMode === "baileys" && hasSession) {
      const { startWa } = await import("@/lib/baileys");
      await startWa();
    }
  } catch (e) {
    console.error("WA reconnect on boot failed:", e);
  }
}
