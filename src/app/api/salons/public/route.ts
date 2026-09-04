// GET /api/salons/public — public multi-salon discovery, HMAC-signed
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { Service } from "@/models/Service";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { checkRateLimit } from "@/lib/middleware/rateLimiter";
import { getDistanceKm } from "@/lib/utils/distance";
import { buildCityRegex } from "@/lib/utils/cityMatch";
import { normalizePriceMode } from "@/helpers/formatPrice";

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

    const query: Record<string, unknown> = {
      isDemo: { $ne: true },
      marketplaceEnabled: true,
    };
    if (city) query.city = { $regex: buildCityRegex(city) };

    const raw = await SalonProfile.find(query)
      .select("_id name city lat lng phone description logo slug tenantId workingHours")
      .limit(10)
      .lean();

    const salons = await Promise.all(
      raw.slice(0, 2).map(async (doc) => {
        const s = doc as Record<string, unknown>;

        const rawServices = await Service.find({ tenantId: s.tenantId })
          .select("name category duration basePrice priceMode")
          .limit(5)
          .lean();

        const salonLat = typeof s.lat === "number" ? s.lat : null;
        const salonLng = typeof s.lng === "number" ? s.lng : null;
        const distance =
          lat != null && lng != null && salonLat != null && salonLng != null
            ? parseFloat(getDistanceKm(lat, lng, salonLat, salonLng).toFixed(1))
            : null;

        return {
          _id: String(s._id),
          name: String(s.name ?? ""),
          city: String(s.city ?? ""),
          lat: salonLat,
          lng: salonLng,
          phone: s.phone ? String(s.phone) : null,
          description: s.description ? String(s.description) : null,
          logo: s.logo ? String(s.logo) : null,
          slug: s.slug ? String(s.slug) : null,
          tenantId: String(s.tenantId ?? ""),
          distance,
          services: rawServices.map((sv) => {
            const r = sv as Record<string, unknown>;
            return {
              _id: String(r._id),
              name: String(r.name ?? ""),
              category: String(r.category ?? ""),
              duration: r.duration != null ? Number(r.duration) : null,
              price: r.basePrice != null ? Number(r.basePrice) : null,
              priceMode: normalizePriceMode(r.priceMode),
            };
          }),
        };
      }),
    );

    return NextResponse.json(salons);
  } catch (err) {
    console.error("[GET /api/salons/public]", err);
    return NextResponse.json({ error: "Greška pri učitavanju salona" }, { status: 500 });
  }
}
