// GET /api/marketplace/salons?city=&lat=&lng=
// Single aggregation — salons + next 3 free slots + services. HMAC-signed.
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { checkRateLimit } from "@/lib/middleware/rateLimiter";
import { getDistanceKm } from "@/lib/utils/distance";

export async function GET(req: NextRequest) {
  const verify = verifySignature(req, "");
  if (!verify.ok) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const apiKey = req.headers.get("x-api-key") ?? "dev";
  if (!checkRateLimit(apiKey)) {
    return NextResponse.json({ error: "Previše zahteva" }, { status: 429 });
  }

  try {
    const { searchParams } = req.nextUrl;
    const city = searchParams.get("city");
    const lat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : null;
    const lng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : null;

    await connectToDB();

    const now = new Date();

    const matchStage: Record<string, unknown> = { isDemo: { $ne: true } };
    if (city) matchStage.city = { $regex: new RegExp(city, "i") };

    const results = await SalonProfile.aggregate([
      { $match: matchStage },

      // ── 1. Lookup next 3 free slots ───────────────────────────────────────
      {
        $lookup: {
          from: "slots",
          let: { salonId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$salonId", "$$salonId"] },
                    { $eq: ["$status", "free"] },
                    { $gte: ["$startTime", now] },
                  ],
                },
              },
            },
            { $sort: { startTime: 1 } },
            { $limit: 3 },
            { $project: { _id: 0, startTime: 1, serviceId: 1 } },
          ],
          as: "nextSlots",
        },
      },

      // ── 2. Lookup services via tenantId ───────────────────────────────────
      {
        $lookup: {
          from: "services",
          let: { tenantId: "$tenantId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$tenantId", "$$tenantId"] },
              },
            },
            { $limit: 5 },
            {
              $project: {
                _id: 1,
                name: 1,
                category: 1,
                duration: 1,
                basePrice: 1,
                priceMode: 1,
              },
            },
          ],
          as: "services",
        },
      },

      // ── 3. Derive nextAvailableSlot ───────────────────────────────────────
      {
        $addFields: {
          nextAvailableSlot: { $arrayElemAt: ["$nextSlots.startTime", 0] },
        },
      },

      // ── 4. Project only needed fields ─────────────────────────────────────
      {
        $project: {
          _id: 1,
          name: 1,
          city: 1,
          lat: 1,
          lng: 1,
          phone: 1,
          description: 1,
          logo: 1,
          slug: 1,
          tenantId: 1,
          nextAvailableSlot: 1,
          nextSlots: 1,
          services: 1,
        },
      },

      // ── 5. Sort by earliest slot, salons with no slots go last ────────────
      {
        $sort: {
          nextAvailableSlot: 1,
        },
      },

      { $limit: 5 },
    ]);

    const salons = results.map((s) => {
      const salonLat = typeof s.lat === "number" ? s.lat : null;
      const salonLng = typeof s.lng === "number" ? s.lng : null;
      const distance =
        lat != null && lng != null && salonLat != null && salonLng != null
          ? parseFloat(getDistanceKm(lat, lng, salonLat, salonLng).toFixed(1))
          : null;

      return {
        id: String(s._id),
        name: String(s.name ?? ""),
        city: String(s.city ?? ""),
        location: { lat: salonLat, lng: salonLng },
        distance,
        phone: s.phone ? String(s.phone) : null,
        description: s.description ? String(s.description) : null,
        logo: s.logo ? String(s.logo) : null,
        slug: s.slug ? String(s.slug) : null,
        nextAvailableSlot: s.nextAvailableSlot ?? null,
        nextSlots: (s.nextSlots as { startTime: Date; serviceId?: Types.ObjectId }[]).map(
          (slot) => ({
            startTime: slot.startTime,
            serviceId: slot.serviceId ? String(slot.serviceId) : null,
          }),
        ),
        services: (s.services as Record<string, unknown>[]).map((sv) => ({
          id: String(sv._id),
          name: String(sv.name ?? ""),
          category: String(sv.category ?? ""),
          duration: sv.duration != null ? Number(sv.duration) : null,
          price: sv.basePrice != null ? Number(sv.basePrice) : null,
          priceMode: sv.priceMode === "on_request" ? "on_request" : "fixed",
        })),
      };
    });

    return NextResponse.json(salons);
  } catch (err) {
    console.error("[GET /api/marketplace/salons]", err);
    return NextResponse.json({ error: "Greška pri učitavanju salona" }, { status: 500 });
  }
}
