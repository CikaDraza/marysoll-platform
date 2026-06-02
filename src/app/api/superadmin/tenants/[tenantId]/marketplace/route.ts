/**
 * GET   /api/superadmin/tenants/[tenantId]/marketplace
 * PATCH /api/superadmin/tenants/[tenantId]/marketplace
 *
 * SuperAdmin: controls whether a salon appears in the booking.marysoll.com
 * marketplace and tunes its city popularity weight.
 *
 * PATCH body: { enabled?: boolean; cityPopularityScore?: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { SalonProfile } from "@/models/SalonProfile";
import { revalidateMarketplaceCaches } from "@/lib/marketplace/revalidateMarketplace";

type Params = { params: Promise<{ tenantId: string }> };

type MarketplaceDoc = {
  _id: unknown;
  tenantId: unknown;
  name?: string;
  city?: string;
  marketplaceEnabled?: boolean;
  marketplaceApprovedAt?: Date | null;
  cityPopularityScore?: number;
};

function serialize(doc: MarketplaceDoc) {
  return {
    tenantId: String(doc.tenantId),
    name: doc.name ?? "",
    city: doc.city ?? "",
    marketplaceEnabled: Boolean(doc.marketplaceEnabled),
    marketplaceApprovedAt: doc.marketplaceApprovedAt
      ? new Date(doc.marketplaceApprovedAt).toISOString()
      : null,
    cityPopularityScore:
      typeof doc.cityPopularityScore === "number" ? doc.cityPopularityScore : 0,
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;
  try {
    await connectToDB();
    const profile = await SalonProfile.findOne({ tenantId })
      .select("_id tenantId name city marketplaceEnabled marketplaceApprovedAt cityPopularityScore")
      .lean<MarketplaceDoc>();

    if (!profile) {
      return NextResponse.json(
        { error: "Profil salona nije pronađen" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: serialize(profile) });
  } catch (err) {
    console.error("GET /api/superadmin/tenants/[tenantId]/marketplace:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    enabled?: unknown;
    cityPopularityScore?: unknown;
  };

  const update: Record<string, unknown> = {};

  if (typeof body.enabled === "boolean") {
    update.marketplaceEnabled = body.enabled;
    update.marketplaceApprovedAt = body.enabled ? new Date() : null;
  }

  if (body.cityPopularityScore !== undefined) {
    const score = Number(body.cityPopularityScore);
    if (!Number.isFinite(score) || score < 0 || score > 10) {
      return NextResponse.json(
        { error: "cityPopularityScore mora biti broj između 0 i 10." },
        { status: 400 },
      );
    }
    update.cityPopularityScore = score;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "Nema validnih polja za izmenu." },
      { status: 400 },
    );
  }

  try {
    await connectToDB();
    const profile = await SalonProfile.findOneAndUpdate(
      { tenantId },
      { $set: update },
      { new: true },
    )
      .select("_id tenantId name city marketplaceEnabled marketplaceApprovedAt cityPopularityScore")
      .lean<MarketplaceDoc>();

    if (!profile) {
      return NextResponse.json(
        { error: "Profil salona nije pronađen" },
        { status: 404 },
      );
    }

    await revalidateMarketplaceCaches();

    return NextResponse.json({
      success: true,
      message: "Marketplace podešavanja su sačuvana.",
      data: serialize(profile),
    });
  } catch (err) {
    console.error("PATCH /api/superadmin/tenants/[tenantId]/marketplace:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
