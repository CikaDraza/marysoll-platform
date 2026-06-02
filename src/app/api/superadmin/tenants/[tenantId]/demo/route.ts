/**
 * PATCH /api/superadmin/tenants/[tenantId]/demo
 *
 * SuperAdmin: toggles the salon's `isDemo` flag. Demo salons are excluded from
 * the marketplace (booking.marysoll.com), so this also busts the marketplace
 * cache.
 *
 * Body: { isDemo: boolean }
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { SalonProfile } from "@/models/SalonProfile";
import { revalidateMarketplaceCaches } from "@/lib/marketplace/revalidateMarketplace";

type Params = { params: Promise<{ tenantId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;
  const body = (await req.json().catch(() => ({}))) as { isDemo?: unknown };

  if (typeof body.isDemo !== "boolean") {
    return NextResponse.json(
      { error: "isDemo (boolean) je obavezan." },
      { status: 400 },
    );
  }

  try {
    await connectToDB();
    const profile = await SalonProfile.findOneAndUpdate(
      { tenantId },
      { $set: { isDemo: body.isDemo } },
      { new: true },
    )
      .select("_id tenantId name isDemo")
      .lean<{ _id: unknown; tenantId: unknown; name?: string; isDemo?: boolean }>();

    if (!profile) {
      return NextResponse.json(
        { error: "Profil salona nije pronađen" },
        { status: 404 },
      );
    }

    await revalidateMarketplaceCaches();

    return NextResponse.json({
      success: true,
      message: body.isDemo
        ? "Salon je označen kao demo (sakriven iz marketplace-a)."
        : "Salon više nije demo.",
      isDemo: Boolean(profile.isDemo),
    });
  } catch (err) {
    console.error("PATCH /api/superadmin/tenants/[tenantId]/demo:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
