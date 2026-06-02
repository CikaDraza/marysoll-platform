/**
 * GET  /api/superadmin/marketplace
 *   Lists all salons with their marketplace visibility + city popularity.
 *
 * POST /api/superadmin/marketplace
 *   Bulk operations.
 *   Body:
 *     { action: "enable" | "disable", tenantIds: string[] }   — bulk toggle
 *     { action: "backfill" }                                  — one-time: enable
 *                                                               every existing
 *                                                               non-demo salon
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { SalonProfile } from "@/models/SalonProfile";
import { revalidateMarketplaceCaches } from "@/lib/marketplace/revalidateMarketplace";

type SalonRow = {
  _id: unknown;
  tenantId: unknown;
  name?: string;
  city?: string;
  isDemo?: boolean;
  marketplaceEnabled?: boolean;
  marketplaceApprovedAt?: Date | null;
  cityPopularityScore?: number;
};

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();
    const rows = await SalonProfile.find({ isDemo: { $ne: true } })
      .select("_id tenantId name city marketplaceEnabled marketplaceApprovedAt cityPopularityScore")
      .sort({ city: 1, name: 1 })
      .lean<SalonRow[]>();

    const salons = rows.map((r) => ({
      tenantId: String(r.tenantId),
      name: r.name ?? "",
      city: r.city ?? "",
      marketplaceEnabled: Boolean(r.marketplaceEnabled),
      marketplaceApprovedAt: r.marketplaceApprovedAt
        ? new Date(r.marketplaceApprovedAt).toISOString()
        : null,
      cityPopularityScore:
        typeof r.cityPopularityScore === "number" ? r.cityPopularityScore : 0,
    }));

    return NextResponse.json({ success: true, salons });
  } catch (err) {
    console.error("GET /api/superadmin/marketplace:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    tenantIds?: unknown;
  };

  try {
    await connectToDB();

    if (body.action === "backfill") {
      // One-time: make every existing non-demo salon visible so the marketplace
      // doesn't go empty when the opt-in default ships. Only touches salons
      // that have never been set (field missing).
      const result = await SalonProfile.updateMany(
        {
          isDemo: { $ne: true },
          marketplaceEnabled: { $exists: false },
        },
        { $set: { marketplaceEnabled: true, marketplaceApprovedAt: new Date() } },
      );
      await revalidateMarketplaceCaches();
      return NextResponse.json({
        success: true,
        message: `Backfill završen. Omogućeno salona: ${result.modifiedCount}.`,
        modified: result.modifiedCount,
      });
    }

    if (body.action === "enable" || body.action === "disable") {
      const tenantIds = Array.isArray(body.tenantIds)
        ? body.tenantIds.filter((t): t is string => typeof t === "string")
        : [];
      if (tenantIds.length === 0) {
        return NextResponse.json(
          { error: "tenantIds je obavezan i ne sme biti prazan." },
          { status: 400 },
        );
      }
      const enabled = body.action === "enable";
      const result = await SalonProfile.updateMany(
        { tenantId: { $in: tenantIds } },
        {
          $set: {
            marketplaceEnabled: enabled,
            marketplaceApprovedAt: enabled ? new Date() : null,
          },
        },
      );
      await revalidateMarketplaceCaches();
      return NextResponse.json({
        success: true,
        message: `${enabled ? "Omogućeno" : "Onemogućeno"} salona: ${result.modifiedCount}.`,
        modified: result.modifiedCount,
      });
    }

    return NextResponse.json(
      { error: "Nepoznata akcija. Koristi: enable | disable | backfill." },
      { status: 400 },
    );
  } catch (err) {
    console.error("POST /api/superadmin/marketplace:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
