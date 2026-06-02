// POST /api/marketplace/slots/reserve
// Atomically reserves a free slot for 5 minutes.
// If the slot is already taken → 409. Race-condition safe.
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Slot } from "@/models/Slot";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { checkRateLimit } from "@/lib/middleware/rateLimiter";

const RESERVATION_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: NextRequest) {
  const verify = verifySignature(req, await req.text());
  if (!verify.ok) {
    return NextResponse.json(
      { error: verify.error },
      { status: verify.status },
    );
  }

  const apiKey = req.headers.get("x-api-key") ?? "dev";
  if (!checkRateLimit(apiKey)) {
    return NextResponse.json({ error: "Previše zahteva" }, { status: 429 });
  }

  let body: { salonId?: string; startTime?: string };
  try {
    body = await req.clone().json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { salonId, startTime } = body;
  if (!salonId || !startTime) {
    return NextResponse.json(
      { error: "salonId i startTime su obavezni" },
      { status: 400 },
    );
  }

  const start = new Date(startTime);
  if (isNaN(start.getTime())) {
    return NextResponse.json(
      { error: "Neispravan startTime" },
      { status: 400 },
    );
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESERVATION_TTL_MS);

  await connectToDB();

  // Claim if: free OR reserved-but-expired (expired reservation is reclaimed atomically)
  const result = await Slot.updateOne(
    {
      salonId,
      startTime: start,
      $or: [
        { status: "maria" },
        { status: "reserved", expiresAt: { $lt: now } },
      ],
    },
    { $set: { status: "reserved", expiresAt } },
  );

  if (result.modifiedCount === 0) {
    return NextResponse.json(
      { error: "Termin nije dostupan" },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, expiresAt });
}
