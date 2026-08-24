/**
 * POST /api/tenants/create-for-me
 *
 * Pravi NOV salon za već prijavljen platformski nalog (`AuthUser`).
 *
 * Zašto postoji: salon i nalog su namerno odvojeni. Vlasnica sme da obriše
 * salon a zadrži nalog, pa da kasnije napravi drugi. `/api/tenants/register`
 * to ne može — on pravi i `AuthUser`, pa na postojeći email vraća 409.
 *
 * Traži prijavljen nalog koji NEMA salon. Ako salon već postoji, odbija —
 * jedan nalog, jedan salon (više salona je zaseban proizvodni razgovor).
 */
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import { SalonProfile } from "@/models/SalonProfile";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { BASE_DOMAIN } from "@/lib/platform/host-context";
import { notifySuperAdminsOfTenantRegistration } from "@/lib/tenantLifecycle/notify";
import { createInitialTenantCapabilityConfiguration } from "@/lib/platform/capabilities";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 40);
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const decoded = token ? verifyToken(token) : null;
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (decoded.isSuperAdmin) {
    return NextResponse.json(
      { error: "Superadmin ne pravi salon na svoj nalog." },
      { status: 403 },
    );
  }

  try {
    await connectToDB();

    const authUser = await AuthUser.findById(decoded.id);
    if (!authUser) {
      return NextResponse.json({ error: "Nalog nije pronađen." }, { status: 404 });
    }
    if (!authUser.isEmailVerified) {
      return NextResponse.json(
        { error: "Email adresa nije verifikovana." },
        { status: 403 },
      );
    }

    // Jedan nalog — jedan salon. Provera ide i po `ownerId` i po `TenantUser`,
    // jer nalog može biti vezan na salon i bez `ownerId`-a (npr. ADMIN uloga).
    const existingOwned = await Tenant.findOne({ ownerId: authUser._id }).lean();
    const existingMembership = await TenantUser.findOne({
      authUserId: authUser._id,
      role: { $in: ["OWNER", "ADMIN", "STAFF"] },
    }).lean();
    if (existingOwned || existingMembership) {
      return NextResponse.json(
        { error: "Nalog već ima salon.", code: "TENANT_ALREADY_EXISTS" },
        { status: 409 },
      );
    }

    const body = (await req.json()) as { salonName?: string; ownerName?: string };
    const salonName = body.salonName?.trim() ?? "";
    const ownerName = body.ownerName?.trim() || authUser.email.split("@")[0];
    if (salonName.length < 2) {
      return NextResponse.json(
        { error: "Unesite ime salona." },
        { status: 400 },
      );
    }

    const baseSlug = slugify(salonName) || "salon";
    let slug = baseSlug;
    let counter = 1;
    while (await Tenant.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const initialCapabilities = createInitialTenantCapabilityConfiguration();

    const tenant = new Tenant({
      name: salonName,
      slug,
      subdomain: slug,
      customDomain: null,
      customDomainVerified: false,
      paid: false,
      verified: true,
      plan: "maria",
      // T2B: eksplicitno provisionovanje capability-ja, isto kao u registraciji.
      // Bez ovoga novi salon pada na capability gate-ovima.
      ...initialCapabilities,
      planExpiresAt: null,
      trialEndsAt: null,
      isTrialActive: false,
      ownerId: authUser._id,
      cloudinaryFolder: `salons/salon-${slug}`,
      status: "active",
    });
    await tenant.save();

    let createdTenantId: Types.ObjectId | null = tenant._id as Types.ObjectId;

    try {
      // Email je već dokazan na `AuthUser`, pa je i ovde `isEmailVerified`.
      // Lozinka se ne traži ponovo — nosi se hash sa platformskog naloga.
      await TenantUser.create({
        tenantId: tenant._id,
        authUserId: authUser._id,
        email: authUser.email,
        password: authUser.passwordHash,
        name: ownerName,
        role: "OWNER",
        isEmailVerified: true,
        status: "active",
      });

      await SalonProfile.create({
        tenantId: tenant._id,
        name: salonName,
        email: authUser.email,
      });
    } catch (inner) {
      // Bez transakcije — očisti pola napravljenog salona da vlasnica može opet.
      if (createdTenantId) {
        await TenantUser.deleteMany({ tenantId: createdTenantId });
        await SalonProfile.deleteMany({ tenantId: createdTenantId });
        await Tenant.findByIdAndDelete(createdTenantId);
        createdTenantId = null;
      }
      throw inner;
    }

    await notifySuperAdminsOfTenantRegistration({
      tenantId: tenant._id,
      salonName,
      ownerName,
      ownerEmail: authUser.email,
      subdomain: `${slug}.${BASE_DOMAIN}`,
    });

    return NextResponse.json(
      { message: "Salon je napravljen.", slug, subdomain: `${slug}.${BASE_DOMAIN}` },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/tenants/create-for-me:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
