// GET /api/marketplace/cities
// Returns the distinct list of cities that have at least one marketplace-enabled
// salon, with aggregated popularity score and a representative coordinate.
// HMAC-signed (same contract as /api/marketplace/salons).
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { checkRateLimit } from "@/lib/middleware/rateLimiter";

interface MarketplaceCity {
  name: string;
  lat: number | null;
  lng: number | null;
  popularityScore: number;
  salonCount: number;
}

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
    await connectToDB();

    const rows = await SalonProfile.aggregate<{
      _id: string;
      lat: number | null;
      lng: number | null;
      popularityScore: number;
      salonCount: number;
    }>([
      // Only marketplace-enabled salons with a non-empty city contribute.
      {
        $match: {
          isDemo: { $ne: true },
          marketplaceEnabled: true,
          city: { $type: "string", $ne: "" },
        },
      },
      // Normalize the city key (trim) so "Bor " and "Bor" collapse.
      {
        $group: {
          _id: { $trim: { input: "$city" } },
          // Representative coordinate: first non-null lat/lng in the city.
          lat: { $max: "$lat" },
          lng: { $max: "$lng" },
          popularityScore: { $max: { $ifNull: ["$cityPopularityScore", 0] } },
          salonCount: { $sum: 1 },
        },
      },
      { $sort: { popularityScore: -1, _id: 1 } },
    ]);

    const cities: MarketplaceCity[] = rows
      .filter((r) => typeof r._id === "string" && r._id.trim().length > 0)
      .map((r) => ({
        name: r._id.trim(),
        lat: typeof r.lat === "number" ? r.lat : null,
        lng: typeof r.lng === "number" ? r.lng : null,
        popularityScore: r.popularityScore ?? 0,
        salonCount: r.salonCount ?? 0,
      }));

    return NextResponse.json(cities, {
      headers: {
        // Cities change rarely; a short CDN cache absorbs the booking-app
        // fan-out. Invalidated faster via the marketplace toggle webhook.
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("[GET /api/marketplace/cities]", err);
    return NextResponse.json(
      { error: "Greška pri učitavanju gradova" },
      { status: 500 },
    );
  }
}
