import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { uploadToCloudinary, deleteFromCloudinary, getTenantFolder } from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";

export async function PUT(req: NextRequest) {
  try {
    await connectToDB();
    const auth = (await requireAdmin(req)) as
      | { decoded: DecodedToken }
      | NextResponse;
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
      "marketingPhone",
    ]) {
      const val = form.get(field);
      if (val && typeof val === "string") profile[field] = val;
    }

    // JSON fields
    const social = parseJSON("social");
    if (social) profile.social = social;
    const wh = parseJSON("workingHours");
    if (wh) profile.workingHours = wh;
    const seo = parseJSON("seo");
    if (seo) profile.seo = seo;
    const branding = parseJSON("branding");
    if (branding) profile.branding = branding;
    const landingTheme = (form.get("landingTheme") as string) || "theme-1";
    if (["theme-1", "theme-2", "theme-3"].includes(landingTheme)) {
      profile.landingTheme = landingTheme;
    }
    const landingStructure = parseJSON("landingStructure");
    if (landingStructure) profile.landingStructure = landingStructure;

    // Logo
    const logoFile = form.get("logo");
    if (logoFile instanceof File && logoFile.size > 0) {
      if (profile.logo)
        await deleteFromCloudinary(profile.logo).catch(console.error);
      const folder = await getTenantFolder(tenantId);
      profile.logo = await uploadToCloudinary(logoFile, folder);
    }

    await profile.save();
    return NextResponse.json({ success: true, data: profile });
  } catch (err) {
    console.error("PUT /api/salon-profile/update:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
