import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { AuthUser } from "@/models/AuthUser";
import { ProfilPlatforme } from "@/models/ProfilPlatforme";

type PlatformProfileRecord = {
  _id: unknown;
  authUserId: unknown;
  displayName?: string;
  contactPhone?: string;
  marketingPhone?: string;
  logoUrl?: string;
  newsletterEmail?: string;
  contactEmail?: string;
  cmsPages?: Record<string, unknown>;
  seo?: Record<string, unknown>;
  geoLocation?: Record<string, unknown>;
  notificationSettings?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
};

function serializeProfile(profile: PlatformProfileRecord) {
  return {
    id: String(profile._id),
    authUserId: String(profile.authUserId),
    displayName: profile.displayName ?? "",
    contactPhone: profile.contactPhone ?? "",
    marketingPhone: profile.marketingPhone ?? "",
    logoUrl: profile.logoUrl ?? "",
    newsletterEmail: profile.newsletterEmail ?? "",
    contactEmail: profile.contactEmail ?? "",
    cmsPages: profile.cmsPages ?? {},
    seo: profile.seo ?? {},
    geoLocation: profile.geoLocation ?? {},
    notificationSettings: profile.notificationSettings ?? {},
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

async function getOrCreateProfile(authUserId: string) {
  const authUser = (await AuthUser.findById(authUserId)
    .select("_id email platformRole")
    .lean()) as { _id: unknown; platformRole?: string } | null;

  if (!authUser || authUser.platformRole !== "SUPER_ADMIN") {
    return null;
  }

  return (await ProfilPlatforme.findOneAndUpdate(
    { authUserId: authUser._id },
    {
      $setOnInsert: {
        authUserId: authUser._id,
        displayName: "Super Admin",
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean()) as PlatformProfileRecord | null;
}

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();

    const profile = await getOrCreateProfile(auth.decoded.id);
    if (!profile) {
      return NextResponse.json({ error: "Profil nije pronađen." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: serializeProfile(profile),
    });
  } catch (err) {
    console.error("GET /api/superadmin/platform-profile:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();

    const profile = await getOrCreateProfile(auth.decoded.id);
    if (!profile) {
      return NextResponse.json({ error: "Profil nije pronađen." }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const update: Record<string, string> = {};

    if (typeof body.displayName === "string") {
      update.displayName = body.displayName.trim();
    }
    if (typeof body.contactPhone === "string") {
      update.contactPhone = body.contactPhone.trim();
    }
    if (typeof body.marketingPhone === "string") {
      update.marketingPhone = body.marketingPhone.trim();
    }
    if (typeof body.logoUrl === "string") {
      update.logoUrl = body.logoUrl.trim();
    }
    if (typeof body.newsletterEmail === "string") {
      update.newsletterEmail = body.newsletterEmail.trim().toLowerCase();
    }
    if (typeof body.contactEmail === "string") {
      update.contactEmail = body.contactEmail.trim().toLowerCase();
    }

    const updated = (await ProfilPlatforme.findOneAndUpdate(
      { authUserId: auth.decoded.id },
      { $set: update },
      { new: true, runValidators: true },
    ).lean()) as PlatformProfileRecord | null;

    if (!updated) {
      return NextResponse.json({ error: "Profil nije pronađen." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Profil platforme je sačuvan.",
      profile: serializeProfile(updated),
    });
  } catch (err) {
    console.error("PATCH /api/superadmin/platform-profile:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
