import { NextResponse } from "next/server";
import { waStatus } from "@/lib/baileys";

// Polled by the Settings page to show the QR / connection state.
export async function GET() {
  return NextResponse.json(waStatus());
}
