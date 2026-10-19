import { NextResponse } from "next/server";

// Public health probe — confirms WHICH build is live and that Baileys loads.
// Also reports which transport the brand is actually on and whether the
// own-number session is linked, so a delivery problem can be diagnosed without
// logging into the dashboard. No secrets here: mode names and booleans only.
export async function GET() {
  let baileys: boolean | string = false;
  try {
    const m = await import("@whiskeysockets/baileys");
    baileys = typeof (m.default ?? m.makeWASocket) === "function";
  } catch (e) {
    baileys = String((e as Error).message || e);
  }

  let waMode = "";
  let linked = false;
  let waConnection = "";
  try {
    const { prisma } = await import("@/lib/db");
    const brand = await prisma.brand.findFirst({ select: { waMode: true, mock: true } });
    waMode = brand?.waMode || (brand?.mock ? "mock" : "meta");
    linked = Boolean(await prisma.waSession.findUnique({ where: { key: "creds" } }));
    const { waStatus } = await import("@/lib/baileys");
    waConnection = waStatus().status;
  } catch (e) {
    waMode = `error: ${String((e as Error).message || e)}`;
  }

  return NextResponse.json({
    ok: true,
    commit: process.env.RAILWAY_GIT_COMMIT_SHA || "",
    baileys,
    waMode,
    linked,
    waConnection,
  });
}
