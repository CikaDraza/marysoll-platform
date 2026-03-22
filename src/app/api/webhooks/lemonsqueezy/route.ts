import { NextRequest, NextResponse } from "next/server";
import { handleLemonSqueezyWebhook, verifyLemonSqueezySignature } from "@/lib/lemonsqueezy";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-signature") ?? "";
  const body = await request.text();

  if (!verifyLemonSqueezySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {
    const event = JSON.parse(body);
    await handleLemonSqueezyWebhook(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Lemon Squeezy webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
