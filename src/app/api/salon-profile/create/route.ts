import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { uploadToCloudinary, getTenantFolder } from "@/lib/cloudinary";
import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { pruneAndValidateManualSlots } from "@/helpers/manualSlots";
import { normalizeVacations } from "@/helpers/vacations";
import {
  THEME_NOT_AVAILABLE,
  isLandingTheme,
} from "@/lib/platform/theme-access";
import { canTenantIdUseTheme } from "@/lib/platform/theme-access-server";

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const auth = requireTenantAdmin(req);
    if (!auth.success) return auth.response;
    const tenantId = auth.tenantId;

    const existing = await SalonProfile.exists({ tenantId });
    if (existing) {
      return NextResponse.json(
        { error: "Profil već postoji. Koristite PUT /update." },
        { status: 409 },
      );
    }

    const form = await req.formData();

    const parseJSON = (key: string) => {
      const val = form.get(key);
      return val && typeof val === "string" ? JSON.parse(val) : {};
    };

    const requestedTheme = form.get("landingTheme");
    const landingTheme = isLandingTheme(requestedTheme)
      ? requestedTheme
      : "theme-1";
    if (!(await canTenantIdUseTheme({ tenantId, theme: landingTheme }))) {
      return NextResponse.json(
        {
          error: "Ova tema nije dostupna ovom nalogu.",
          code: THEME_NOT_AVAILABLE,
        },
        { status: 403 },
      );
    }

    let logoUrl: string | null = null;
    const logoFile = form.get("logo");
    if (logoFile instanceof File && logoFile.size > 0) {
      const folder = await getTenantFolder(tenantId);
      logoUrl = await uploadToCloudinary(logoFile, folder);
    }
    const cancellationWindowHoursRaw = form.get("cancellationWindowHours");
    const cancellationWindowHours =
      typeof cancellationWindowHoursRaw === "string" &&
      /^\d+$/.test(cancellationWindowHoursRaw)
        ? Number(cancellationWindowHoursRaw)
        : 1;

    const landingStructureRaw = form.get("landingStructure");
    const landingStructure =
      landingStructureRaw && typeof landingStructureRaw === "string"
        ? JSON.parse(landingStructureRaw)
        : undefined;

    const availabilityModeRaw = form.get("availabilityMode");
    const availabilityMode =
      availabilityModeRaw === "manualSlots" ? "manualSlots" : "workingHours";
    const manualSlots = pruneAndValidateManualSlots(parseJSON("manualSlots"));
    const showWorkingHours = form.get("showWorkingHours") !== "false";

    const created = await SalonProfile.create({
      tenantId,
      name: form.get("name"),
      email: form.get("email"),
      description: form.get("description") ?? "",
      phone: form.get("phone") ?? "",
      street: form.get("street") ?? "",
      city: form.get("city") ?? "",
      newsletterEmail: form.get("newsletterEmail") ?? "",
      contactEmail: form.get("contactEmail") ?? "",
      bookingEmail: form.get("bookingEmail") ?? "",
      marketingPhone: form.get("marketingPhone") ?? "",
      resendApiKey: form.get("resendApiKey") ?? "",
      logo: logoUrl,
      landingTheme,
      social: parseJSON("social"),
      workingHours: parseJSON("workingHours"),
      vacations: normalizeVacations(parseJSON("vacations")),
      availabilityMode,
      manualSlots,
      showWorkingHours,
      cancellationWindowHours,
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
