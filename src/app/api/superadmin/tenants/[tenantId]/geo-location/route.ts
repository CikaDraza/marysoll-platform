/**
 * GET/PATCH /api/superadmin/tenants/[tenantId]/geo-location
 *
 * SuperAdmin only. Reads salon address and stores precise Google Maps coordinates.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { SalonProfile } from "@/models/SalonProfile";
import { validateGeoCoordinates } from "@/helpers/validateGeoCoordinates";
import { revalidateMarketplaceCaches } from "@/lib/marketplace/revalidateMarketplace";

type Params = { params: Promise<{ tenantId: string }> };

type SalonGeoLocationDoc = {
  _id: unknown;
  tenantId: unknown;
  name?: string;
  street?: string;
  city?: string;
  lat?: number | null;
  lng?: number | null;
};

function serializeSalonGeoLocation(profile: SalonGeoLocationDoc) {
  return {
    _id: String(profile._id),
    tenantId: String(profile.tenantId),
    name: profile.name ?? "",
    street: profile.street ?? "",
    city: profile.city ?? "",
    lat: typeof profile.lat === "number" ? profile.lat : null,
    lng: typeof profile.lng === "number" ? profile.lng : null,
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;

  try {
    await connectToDB();

    const profile = await SalonProfile.findOne({ tenantId })
      .select("_id tenantId name street city lat lng")
      .lean<SalonGeoLocationDoc>();

    if (!profile) {
      return NextResponse.json(
        { error: "Profil salona nije pronađen" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeSalonGeoLocation(profile),
    });
  } catch (err) {
    console.error("GET /api/superadmin/tenants/[tenantId]/geo-location:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    lat?: unknown;
    lng?: unknown;
  };

  const validation = validateGeoCoordinates(body.lat, body.lng);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    await connectToDB();

    const profile = await SalonProfile.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          lat: validation.coordinates.lat,
          lng: validation.coordinates.lng,
        },
      },
      { new: true },
    )
      .select("_id tenantId name street city lat lng")
      .lean<SalonGeoLocationDoc>();

    if (!profile) {
      return NextResponse.json(
        { error: "Profil salona nije pronađen" },
        { status: 404 },
      );
    }

    // Coordinate change affects booking's local distance ranking.
    await revalidateMarketplaceCaches();

    return NextResponse.json({
      success: true,
      message: "Geo lokacija je sačuvana.",
      data: serializeSalonGeoLocation(profile),
    });
  } catch (err) {
    console.error("PATCH /api/superadmin/tenants/[tenantId]/geo-location:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
