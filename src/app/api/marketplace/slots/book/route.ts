// POST /api/marketplace/slots/book
// Atomically marks a slot as booked (confirmation step after reserve).
// Also exposes DELETE to cancel a booking and return the slot to "maria".
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Slot } from "@/models/Slot";
import { SalonProfile } from "@/models/SalonProfile";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { checkRateLimit } from "@/lib/middleware/rateLimiter";
import { requireCapability } from "@/lib/platform/capabilities-server";

// async function parseBody(
//   req: NextRequest,
// ): Promise<{ salonId?: string; startTime?: string }> {
//   try {
//     return await req.clone().json();
//   } catch {
//     return {};
//   }
// }

function authCheck(req: NextRequest, bodyText: string) {
  const verify = verifySignature(req, bodyText);
  const apiKey = req.headers.get("x-api-key") ?? "dev";
  if (!verify.ok)
    return NextResponse.json(
      { error: verify.error },
      { status: verify.status },
    );
  if (!checkRateLimit(apiKey))
    return NextResponse.json({ error: "Previše zahteva" }, { status: 429 });
  return null;
}

// Book a slot (must be "reserved" or still "maria" — guards against race conditions)
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const denied = authCheck(req, rawBody);
  if (denied) return denied;

  let body: { salonId?: string; startTime?: string };
  try {
    body = JSON.parse(rawBody);
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
  await connectToDB();
  const salon = await SalonProfile.findById(salonId).select("tenantId").lean();
  if (!salon) return NextResponse.json({ error: "Salon nije pronađen" }, { status: 404 });
  const capabilityDenied = await requireCapability(
    String((salon as Record<string, unknown>).tenantId ?? ""),
    "booking.services",
  );
  if (capabilityDenied) return capabilityDenied;

  const result = await Slot.updateOne(
    {
      salonId,
      startTime: start,
      $or: [
        { status: "maria" },
        { status: "reserved", expiresAt: { $gt: now } }, // only valid reservation
      ],
    },
    { $set: { status: "booked" }, $unset: { expiresAt: "" } },
  );

  if (result.modifiedCount === 0) {
    return NextResponse.json(
      { error: "Termin nije dostupan" },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}

// Cancel a booking — returns slot to "maria"
export async function DELETE(req: NextRequest) {
  const rawBody = await req.text();
  const denied = authCheck(req, rawBody);
  if (denied) return denied;

  const { searchParams } = req.nextUrl;
  const salonId = searchParams.get("salonId");
  const startTime = searchParams.get("startTime");

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

  await connectToDB();
  const salon = await SalonProfile.findById(salonId).select("tenantId").lean();
  if (!salon) return NextResponse.json({ error: "Salon nije pronađen" }, { status: 404 });
  const capabilityDenied = await requireCapability(
    String((salon as Record<string, unknown>).tenantId ?? ""),
    "booking.services",
  );
  if (capabilityDenied) return capabilityDenied;

  const result = await Slot.updateOne(
    { salonId, startTime: start, status: "booked" },
    { $set: { status: "maria" }, $unset: { expiresAt: "" } },
  );

  if (result.modifiedCount === 0) {
    return NextResponse.json(
      { error: "Termin nije pronađen ili nije zauzet" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
