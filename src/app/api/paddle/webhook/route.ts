// src/app/api/paddle/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const headers = Object.fromEntries(req.headers.entries());

  console.log("[PADDLE_WEBHOOK_HEADERS]", headers);
  console.log("[PADDLE_WEBHOOK_BODY]", rawBody);

  return NextResponse.json({ received: true });
}
