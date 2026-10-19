import { NextResponse } from "next/server";

// Public health probe — confirms WHICH build is live and that Baileys loads.
export async function GET() {
  let baileys: boolean | string = false;
  try {
    const m = await import("@whiskeysockets/baileys");
    baileys = typeof (m.default ?? m.makeWASocket) === "function";
  } catch (e) {
    baileys = String((e as Error).message || e);
  }
  return NextResponse.json({
    ok: true,
    commit: process.env.RAILWAY_GIT_COMMIT_SHA || "",
    baileys,
  });
}
