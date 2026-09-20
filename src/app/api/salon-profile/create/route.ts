import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { uploadToCloudinary, uploadToCloudinaryWithMetadata, getTenantFolder } from "@/lib/cloudinary";
import { faviconSettingsSchema, validateFaviconFile } from "@/lib/branding/faviconValidation";
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
    let faviconSettings;
    const faviconRaw = form.get("favicon");
    if (faviconRaw !== null) {
      let input: unknown;
      try { input = typeof faviconRaw === "string" ? JSON.parse(faviconRaw) : null; }
      catch { return NextResponse.json({ error: "Neispravna podešavanja ikonice." }, { status: 400 }); }
      const parsed = faviconSettingsSchema.safeParse(input);
      if (!parsed.success) return NextResponse.json({ error: "Neispravna podešavanja ikonice." }, { status: 400 });
      faviconSettings = parsed.data;
    }
    const faviconFile = form.get("faviconFile");
    if (faviconFile !== null && !(faviconFile instanceof File)) return NextResponse.json({ error: "Neispravan fajl ikonice." }, { status: 400 });
    if (faviconFile instanceof File) {
      const error = await validateFaviconFile(faviconFile);
      if (error) return NextResponse.json({ error }, { status: 400 });
    }

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
    let sourceRatio: number | null = null;
    let sourceWidth: number | null = null;
    let sourceHeight: number | null = null;
    const logoFile = form.get("logo");
    if (logoFile instanceof File && logoFile.size > 0) {
      const folder = await getTenantFolder(tenantId);
      const uploaded = await uploadToCloudinaryWithMetadata(logoFile, folder);
      logoUrl = uploaded.secure_url;
      sourceRatio = uploaded.width && uploaded.height ? uploaded.width / uploaded.height : null;
      sourceWidth = uploaded.width ?? null;
      sourceHeight = uploaded.height ?? null;
    }
    let customUrl: string | null = null;
    if (faviconFile instanceof File) {
      const folder = await getTenantFolder(tenantId);
      customUrl = await uploadToCloudinary(faviconFile, `${folder}/favicon`);
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
      favicon: { ...faviconSettings, mode: faviconSettings?.mode === "custom" && !customUrl ? "auto" : faviconSettings?.mode ?? (customUrl ? "custom" : "auto"), customUrl, sourceRatio, sourceWidth, sourceHeight, version: 1 },
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
