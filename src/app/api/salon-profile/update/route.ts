import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { Tenant } from "@/models/Tenant";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  getTenantFolder,
} from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";
import { revalidateMarketplaceCaches } from "@/lib/marketplace/revalidateMarketplace";

export async function PUT(req: NextRequest) {
  try {
    await connectToDB();
    const auth = requireAdmin(req) as { decoded: DecodedToken } | NextResponse;
    if (auth instanceof NextResponse) return auth;
    const tenantId = auth.decoded.tenantId;

    const profile = tenantId
      ? await SalonProfile.findOne({ tenantId })
      : await SalonProfile.findOne({});
    if (!profile)
      return NextResponse.json(
        { error: "Profil ne postoji." },
        { status: 404 },
      );

    const form = await req.formData();
    const parseJSON = (key: string, fallback: unknown = undefined) => {
      const val = form.get(key);
      return val && typeof val === "string" ? JSON.parse(val) : fallback;
    };

    // Text fields
    for (const field of [
      "name",
      "description",
      "phone",
      "street",
      "city",
      "newsletterEmail",
      "contactEmail",
      "bookingEmail",
      "marketingPhone",
      "resendApiKey",
    ]) {
      const val = form.get(field);
      if (val && typeof val === "string") profile[field] = val;
    }

    // JSON fields
    const social = parseJSON("social");
    if (social) profile.social = social;
    const wh = parseJSON("workingHours");
    if (wh) profile.workingHours = wh;
    const cancellationWindowHours = form.get("cancellationWindowHours");
    if (
      typeof cancellationWindowHours === "string" &&
      /^\d+$/.test(cancellationWindowHours)
    ) {
      profile.cancellationWindowHours = Number(cancellationWindowHours);
    }
    const seo = parseJSON("seo");
    if (seo) profile.seo = seo;
    const branding = parseJSON("branding");
    if (branding) profile.branding = branding;
    const landingTheme = (form.get("landingTheme") as string) || "theme-1";
    if (
      [
        "theme-1",
        "theme-2",
        "theme-3",
        "theme-4",
        "theme-5",
        "theme-6",
        "theme-7",
        "theme-8",
      ].includes(landingTheme)
    ) {
      profile.landingTheme = landingTheme;
    }
    const landingStructure = parseJSON("landingStructure");
    if (landingStructure) profile.landingStructure = landingStructure;

    // Logo
    const logoFile = form.get("logo");
    if (logoFile instanceof File && logoFile.size > 0) {
      if (profile.logo)
        await deleteFromCloudinary(profile.logo).catch(console.error);
      const base = await getTenantFolder(tenantId);
      profile.logo = await uploadToCloudinary(logoFile, `${base}/logo`);
    }

    await profile.save();

    // Sinhronizuj Tenant.name sa nazivom salona — superadmin dashboard i
    // marketplace čitaju Tenant.name, pa bi inače ostao stari naziv.
    const nameVal = form.get("name");
    const targetTenantId = profile.tenantId ?? tenantId;
    if (targetTenantId && typeof nameVal === "string" && nameVal.trim()) {
      await Tenant.updateOne(
        { _id: targetTenantId },
        { $set: { name: nameVal.trim() } },
      );
    }

    // Name/city/street/phone/working-hours edits surface in booking + AI knowledge.
    await revalidateMarketplaceCaches();
    return NextResponse.json({ success: true, data: profile });
  } catch (err) {
    console.error("PUT /api/salon-profile/update:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
