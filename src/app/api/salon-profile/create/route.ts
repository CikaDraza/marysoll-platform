import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { uploadToCloudinary, getTenantFolder } from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const auth = (await requireAdmin(req)) as
      | { decoded: DecodedToken }
      | NextResponse;
    if (auth instanceof NextResponse) return auth;
    const tenantId = auth.decoded.tenantId;
    const existing = tenantId
      ? await SalonProfile.exists({ tenantId })
      : await SalonProfile.exists({});
    if (existing) {
      return NextResponse.json(
        { error: "Profil već postoji. Koristite PUT /update." },
        { status: 409 },
      );
    }

    const form = await req.formData();

    let logoUrl: string | null = null;
    const logoFile = form.get("logo");
    if (logoFile instanceof File && logoFile.size > 0) {
      const folder = await getTenantFolder(tenantId);
      logoUrl = await uploadToCloudinary(logoFile, folder);
    }

    const parseJSON = (key: string) => {
      const val = form.get(key);
      return val && typeof val === "string" ? JSON.parse(val) : {};
    };

    const landingTheme = (form.get("landingTheme") as string) || "theme-1";

    const landingStructureRaw = form.get("landingStructure");
    const landingStructure =
      landingStructureRaw && typeof landingStructureRaw === "string"
        ? JSON.parse(landingStructureRaw)
        : undefined;

    const created = await SalonProfile.create({
      tenantId: tenantId ?? undefined,
      name: form.get("name"),
      email: form.get("email"),
      description: form.get("description") ?? "",
      phone: form.get("phone") ?? "",
      street: form.get("street") ?? "",
      city: form.get("city") ?? "",
      newsletterEmail: form.get("newsletterEmail") ?? "",
      contactEmail: form.get("contactEmail") ?? "",
      marketingPhone: form.get("marketingPhone") ?? "",
      logo: logoUrl,
      landingTheme: ["theme-1", "theme-2", "theme-3"].includes(landingTheme)
        ? landingTheme
        : "theme-1",
      social: parseJSON("social"),
      workingHours: parseJSON("workingHours"),
      seo: parseJSON("seo"),
      branding: parseJSON("branding"),
      ...(landingStructure ? { landingStructure } : {}),
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/salon-profile/create:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
