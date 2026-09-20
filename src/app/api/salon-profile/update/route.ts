import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { Tenant } from "@/models/Tenant";
import {
  uploadToCloudinary,
  uploadToCloudinaryWithMetadata,
  deleteFromCloudinary,
  getTenantFolder,
} from "@/lib/cloudinary";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { faviconFingerprint } from "@/lib/branding/favicon";
import { faviconSettingsSchema, faviconStoredUrlSchema, validateFaviconFile } from "@/lib/branding/faviconValidation";
import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { revalidateMarketplaceCaches } from "@/lib/marketplace/revalidateMarketplace";
import { pruneAndValidateManualSlots } from "@/helpers/manualSlots";
import { normalizeVacations } from "@/helpers/vacations";
import type { LandingStructure } from "@/types";
import { mergeLandingStructureUpdate } from "@/lib/salon-profile/content-preservation";
import {
  THEME_NOT_AVAILABLE,
  isLandingTheme,
} from "@/lib/platform/theme-access";
import { canTenantIdUseTheme } from "@/lib/platform/theme-access-server";

export async function PUT(req: NextRequest) {
  try {
    await connectToDB();
    const auth = requireTenantAdmin(req);
    if (!auth.success) return auth.response;
    const tenantId = auth.tenantId;

    const profile = await SalonProfile.findOne({ tenantId });
    if (!profile)
      return NextResponse.json(
        { error: "Profil ne postoji." },
        { status: 404 },
      );

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
    const removeValue = form.get("removeCustomFavicon") ?? form.get("removeFavicon");
    if (!z.enum(["true", "false"]).nullable().safeParse(removeValue).success) return NextResponse.json({ error: "Neispravna komanda za uklanjanje ikonice." }, { status: 400 });
    const removeCustomFavicon = removeValue === "true";
    if (faviconFile instanceof File && removeCustomFavicon) return NextResponse.json({ error: "Ikonica ne može biti istovremeno uklonjena i otpremljena." }, { status: 400 });
    const beforeFavicon = faviconFingerprint({ name: profile.name, logo: profile.logo, branding: profile.branding, favicon: profile.favicon });
    const previousLogo = profile.logo;
    const previousCustomFavicon = profile.favicon?.customUrl;
    let customRemoved = false;
    let logoReplaced = false;
    const parseJSON = (key: string, fallback: unknown = undefined) => {
      const val = form.get(key);
      return val && typeof val === "string" ? JSON.parse(val) : fallback;
    };

    const requestedTheme = form.get("landingTheme");
    if (isLandingTheme(requestedTheme)) {
      if (!(await canTenantIdUseTheme({ tenantId, theme: requestedTheme }))) {
        return NextResponse.json(
          {
            error: "Ova tema nije dostupna ovom nalogu.",
            code: THEME_NOT_AVAILABLE,
          },
          { status: 403 },
        );
      }
      profile.landingTheme = requestedTheme;
    }

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
    const vacationsRaw = form.get("vacations");
    if (typeof vacationsRaw === "string") {
      profile.vacations = normalizeVacations(JSON.parse(vacationsRaw));
      profile.markModified("vacations");
    }
    const availabilityMode = form.get("availabilityMode");
    if (availabilityMode === "workingHours" || availabilityMode === "manualSlots") {
      profile.availabilityMode = availabilityMode;
    }
    const manualSlots = parseJSON("manualSlots");
    if (manualSlots && typeof manualSlots === "object") {
      profile.manualSlots = pruneAndValidateManualSlots(manualSlots);
      profile.markModified("manualSlots"); // Object polje zahteva eksplicitan markModified
    }
    const showWorkingHours = form.get("showWorkingHours");
    if (showWorkingHours === "true" || showWorkingHours === "false") {
      profile.showWorkingHours = showWorkingHours === "true";
    }
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
    if (faviconSettings) {
      profile.favicon = { ...(profile.favicon?.toObject?.() ?? profile.favicon), ...faviconSettings };
      profile.markModified("favicon");
    }
    const landingStructure = parseJSON("landingStructure");
    if (landingStructure) {
      const current = profile.toObject().landingStructure as
        | LandingStructure
        | undefined;
      profile.landingStructure = mergeLandingStructureUpdate(
        current,
        landingStructure as LandingStructure,
      );
      profile.markModified("landingStructure");
    }

    // Logo
    const logoFile = form.get("logo");
    if (logoFile instanceof File && logoFile.size > 0) {
      const base = await getTenantFolder(tenantId);
      const uploaded = await uploadToCloudinaryWithMetadata(logoFile, `${base}/logo`);
      profile.logo = uploaded.secure_url;
      profile.favicon = { ...(profile.favicon?.toObject?.() ?? profile.favicon), sourceRatio: uploaded.width && uploaded.height ? uploaded.width / uploaded.height : null, sourceWidth: uploaded.width ?? null, sourceHeight: uploaded.height ?? null };
      profile.markModified("favicon");
      logoReplaced = true;
    } else if (form.get("removeLogo") === "true" && profile.logo) {
      profile.logo = null;
      profile.favicon = { ...(profile.favicon?.toObject?.() ?? profile.favicon), sourceRatio: null, sourceWidth: null, sourceHeight: null };
      profile.markModified("favicon");
      logoReplaced = true;
    }

    // Logo za notifikacije i mejlove (zaseban od loga sajta). Ako se ukloni,
    // fallback je Marysoll default (SVG se ne renderuje u push notifikacijama).
    const notifLogoFile = form.get("notificationLogo");
    if (notifLogoFile instanceof File && notifLogoFile.size > 0) {
      // Server-side zaštita: SVG nije dozvoljen (browser ne renderuje SVG ikonu).
      const isSvg =
        notifLogoFile.type === "image/svg+xml" ||
        /\.svg$/i.test(notifLogoFile.name);
      if (isSvg) {
        return NextResponse.json(
          {
            error:
              "SVG nije podržan za logo notifikacija. Koristite PNG, JPG ili WebP.",
          },
          { status: 400 },
        );
      }
      if (profile.notificationLogo)
        await deleteFromCloudinary(profile.notificationLogo).catch(console.error);
      const base = await getTenantFolder(tenantId);
      profile.notificationLogo = await uploadToCloudinary(
        notifLogoFile,
        `${base}/notification-logo`,
      );
    } else if (form.get("removeNotificationLogo") === "true") {
      if (profile.notificationLogo)
        await deleteFromCloudinary(profile.notificationLogo).catch(console.error);
      profile.notificationLogo = null;
    }

    if (faviconFile instanceof File) {
      const base = await getTenantFolder(tenantId);
      profile.favicon = { ...(profile.favicon?.toObject?.() ?? profile.favicon), mode: faviconSettings?.mode ?? "custom", customUrl: await uploadToCloudinary(faviconFile, `${base}/favicon`) };
      profile.markModified("favicon");
      customRemoved = !!previousCustomFavicon;
    } else if (removeCustomFavicon) {
      const mode = profile.favicon?.mode === "custom" ? "auto" : profile.favicon?.mode ?? "auto";
      profile.favicon = { ...(profile.favicon?.toObject?.() ?? profile.favicon), mode, customUrl: null };
      profile.markModified("favicon");
      customRemoved = !!previousCustomFavicon;
    }
    if (profile.favicon?.mode === "custom" && !faviconStoredUrlSchema.safeParse(profile.favicon.customUrl).success) {
      profile.favicon = { ...(profile.favicon?.toObject?.() ?? profile.favicon), mode: "auto", customUrl: null };
      profile.markModified("favicon");
    }

    const afterFavicon = faviconFingerprint({ name: profile.name, logo: profile.logo, branding: profile.branding, favicon: profile.favicon });
    const faviconChanged = beforeFavicon !== afterFavicon;
    if (faviconChanged) {
      profile.favicon = { ...(profile.favicon?.toObject?.() ?? profile.favicon), version: (Number(profile.favicon?.version) || 1) + 1 };
      profile.markModified("favicon");
    }

    await profile.save();
    if (logoReplaced && previousLogo) await deleteFromCloudinary(previousLogo).catch(console.error);
    if (customRemoved && previousCustomFavicon) await deleteFromCloudinary(previousCustomFavicon).catch(console.error);
    if (faviconChanged) {
      const tenant = await Tenant.findById(tenantId).select("slug").lean() as { slug?: string } | null;
      if (tenant?.slug) revalidateTag(`tenant-profile-${tenant.slug}`, { expire: 0 });
    }

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
