// src/app/api/paddle/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  handlePaddleWebhook,
  verifyPaddleSignature,
  getPaddleWebhookSecret,
} from "@/lib/paddle";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature");

  const isValid = verifyPaddleSignature({
    rawBody,
    signature,
    secret: getPaddleWebhookSecret(),
  });

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody);
    await handlePaddleWebhook(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[PADDLE_WEBHOOK] error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
