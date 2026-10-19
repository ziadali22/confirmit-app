import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma, getBrand } from "@/lib/db";
import { parseInbound } from "@/lib/whatsapp";
import { handleOptionTap } from "@/lib/flow";

// Meta verifies the webhook with a GET challenge on setup.
export async function GET(req: NextRequest) {
  const brand = await getBrand();
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === brand.verifyToken) {
    return new NextResponse(p.get("hub.challenge") || "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text(); // raw body for signature verification
  const brand = await getBrand();

  // Signatures are only skipped in mock mode. In live mode we FAIL CLOSED:
  // no app secret => reject, so forged taps can't confirm/cancel orders.
  if (!brand.mock) {
    if (!brand.appSecret) return new NextResponse("app secret not configured", { status: 403 });
    const sig = req.headers.get("x-hub-signature-256") || "";
    const expected =
      "sha256=" + crypto.createHmac("sha256", brand.appSecret).update(raw).digest("hex");
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return new NextResponse("bad signature", { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true }); // always 200 so Meta doesn't retry
  }

  const reply = parseInbound(body);
  if (!reply) return NextResponse.json({ ok: true }); // status/delivery events

  // Match the order by the replied-to message id, then fall back to the latest
  // open order for that phone number.
  let order = reply.contextId
    ? await prisma.order.findFirst({
        where: { brandId: brand.id, lastWaMessageId: reply.contextId },
      })
    : null;
  if (!order) {
    order = await prisma.order.findFirst({
      where: {
        brandId: brand.id,
        status: "confirming",
        customer: { phone: reply.from },
      },
      orderBy: { id: "desc" },
    });
  }
  if (!order) return NextResponse.json({ ok: true });

  // Log inbound + run the option handler if a list row was tapped.
  await prisma.messageLog.create({
    data: { brandId: brand.id, orderId: order.id, phone: reply.from, direction: "in", kind: "reply", body: reply.text },
  });
  // Always return 200 — Meta retries anything else, which would reprocess.
  if (reply.optionId) {
    try {
      await handleOptionTap(order.id, reply.optionId);
    } catch (e) {
      console.error("handleOptionTap failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
