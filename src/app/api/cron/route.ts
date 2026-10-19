import { NextRequest, NextResponse } from "next/server";
import { runDueJobs } from "@/lib/flow";

// Scheduler tick. Call on an interval (Railway cron, Cloudflare Cron Trigger, or
// an external cron hitting this URL). Stateless + idempotent — safe to call often.
// Protect it with CRON_SECRET so it can't be triggered by random traffic.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("x-cron-key") || req.nextUrl.searchParams.get("key");
    if (provided !== secret) return new NextResponse("forbidden", { status: 403 });
  }
  const n = await runDueJobs();
  return NextResponse.json({ ran: n });
}
