// GET /api/marketplace/services?salonId=
// Marketplace — services for a given salon by salonId (no admin auth)
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { Service } from "@/models/Service";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { checkRateLimit } from "@/lib/middleware/rateLimiter";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { normalizePriceMode } from "@/helpers/formatPrice";
import { subdocRef } from "@/lib/booking/subdocRef";

export async function GET(req: NextRequest) {
  const verify = verifySignature(req, "");
  if (!verify.ok) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const apiKey = req.headers.get("x-api-key") ?? "dev";
  if (!checkRateLimit(apiKey)) {
    return NextResponse.json({ error: "Previše zahteva" }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const salonId = searchParams.get("salonId");
  if (!salonId) {
    return NextResponse.json({ error: "salonId je obavezan" }, { status: 400 });
  }

  try {
    await connectToDB();

    const salon = await SalonProfile.findById(salonId).select("tenantId").lean();
    if (!salon) {
      return NextResponse.json({ error: "Salon nije pronađen" }, { status: 404 });
    }
    const tenantId = String((salon as Record<string, unknown>).tenantId ?? "");
    const denied = await requireCapability(tenantId, "services.catalog");
    if (denied) return NextResponse.json([]);

    const services = await Service.find({ tenantId })
      .sort({ category: 1, name: 1 })
      .lean();

    return NextResponse.json(
      services.map((s) => {
        const r = s as Record<string, unknown>;
        return {
          _id: String(r._id),
          name: String(r.name ?? ""),
          category: String(r.category ?? ""),
          subcategory: r.subcategory ? String(r.subcategory) : null,
          type: String(r.type ?? "single"),
          duration: r.duration != null ? Number(r.duration) : null,
          basePrice: r.basePrice != null ? Number(r.basePrice) : null,
          priceMode: normalizePriceMode(r.priceMode),
          // Varijante — bez `_id` kao javnog polja, ali sa `ref` adresom koju
          // Booking Engine očekuje. Booking app iz ovoga i dalje sam računa
          // "od" cenu (min) i "do" trajanje (max) po svom pravilu.
          variants: Array.isArray(r.variants)
            ? (r.variants as Record<string, unknown>[]).map((v) => ({
                ref: subdocRef(v),
                name: String(v.name ?? ""),
                price: v.price != null ? Number(v.price) : null,
                priceMode: normalizePriceMode(v.priceMode),
                duration: v.duration != null ? Number(v.duration) : null,
                perItem: v.perItem === true,
              }))
            : [],
        };
      }),
    );
  } catch (err) {
    console.error("[GET /api/marketplace/services]", err);
    return NextResponse.json({ error: "Greška pri učitavanju usluga" }, { status: 500 });
  }
}
