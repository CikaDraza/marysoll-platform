import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { AuthUser } from "@/models/AuthUser";
import { TenantUser } from "@/models/TenantUser";
import { SalonProfile } from "@/models/SalonProfile";
import { Subscription } from "@/models/Subscription";
import { sendOwnerVerificationEmail, TRIAL_DAYS } from "@/lib/email/onboarding";
import { notifySuperAdminsOfTenantRegistration } from "@/lib/tenantLifecycle/notify";
import { upsertOwnerNewsletterContact } from "@/lib/newsletterService";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { BASE_DOMAIN } from "@/lib/platform/host-context";
import { createInitialTenantCapabilityConfiguration } from "@/lib/platform/capabilities";
import { resolveTenantRegistrationIdentity } from "@/lib/tenant-registration";

/**
 * POST /api/tenants/register
 *
 * Registers a new tenant OWNER (Salon / Education / Hybrid preset).
 * Creates:
 *   AuthUser  — global platform identity (for marysoll.com platform access)
 *   Tenant    — business workspace record (status: pending)
 *   TenantUser — OWNER profile WITH email+password
 *   SalonProfile — legacy presentation profile required by Theme system
 *
 * Trial activates only after email verification.
 */
export async function POST(request: NextRequest) {
  // Registration is not a single transaction. Track what we create so a later
  // failure (e.g. a DB error mid-flow) can be rolled back — otherwise an
  // orphaned AuthUser/Tenant lingers and the owner can never retry (409).
  let createdAuthUserId: Types.ObjectId | null = null;
  let createdTenantId: Types.ObjectId | null = null;

  try {
    await connectToDB();

    const body = await request.json();
    const identity = resolveTenantRegistrationIdentity(body);
    const {
      ownerName,
      email,
      password,
      phone,
      agreedToPrivacy,
      newsletterOptIn = false,
    } = body;

    if (
      !identity ||
      !ownerName ||
      !email ||
      !password ||
      !phone ||
      !agreedToPrivacy
    ) {
      return NextResponse.json(
        { error: "Sva polja su obavezna" },
        { status: 400 },
      );
    }
    const { businessName, preset } = identity;
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Lozinka mora imati najmanje 8 karaktera" },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Unesite ispravnu email adresu" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Block if an AuthUser already exists with this email (platform-level uniqueness for owners).
    const existingAuthUser = await AuthUser.findOne({ email: normalizedEmail });
    if (existingAuthUser) {
      return NextResponse.json(
        { error: "Nalog sa ovim emailom već postoji" },
        { status: 409 },
      );
    }

    // Generate unique slug
    const baseSlug = businessName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 40);

    let slug = baseSlug;
    let counter = 1;
    while (await Tenant.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const subdomain = `${slug}.${BASE_DOMAIN}`;
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 12);
    const initialCapabilities =
      createInitialTenantCapabilityConfiguration(preset);

    // 1. AuthUser — platform-level identity for OWNER (marysoll.com access)
    const authUser = new AuthUser({
      email: normalizedEmail,
      passwordHash: hashedPassword,
      isEmailVerified: false,
      verificationToken,
      verificationTokenExpiry,
      platformRole: "OWNER",
    });
    await authUser.save();
    createdAuthUserId = authUser._id as Types.ObjectId;

    // 2. Tenant (pending — trial starts after email verification)
    const tenant = new Tenant({
      name: businessName,
      slug,
      subdomain: slug,
      customDomain: null,
      customDomainVerified: false,
      paid: false,
      verified: false,
      plan: "maria",
      ...initialCapabilities,
      planExpiresAt: null,
      trialEndsAt: null,
      isTrialActive: false,
      ownerId: authUser._id,
      cloudinaryFolder: `salons/salon-${slug}`,
      status: "pending",
      aiSettings: {
        chatEnabled: true,
        landingEnabled: true,
        imageEnabled: true,
        chatRpmLimit: 20,
        landingRpmLimit: 5,
        imageRpmLimit: 3,
      },
      storageMetrics: {
        mongoUsageMb: 0,
        cloudinaryUsageMb: 0,
        updatedAt: new Date(),
      },
    });
    await tenant.save();
    createdTenantId = tenant._id as Types.ObjectId;

    // 3. TenantUser — OWNER profile WITH per-tenant credentials.
    //    email + password here are for tenant login (salon URL).
    //    authUserId links to AuthUser for platform access.
    const tenantUser = new TenantUser({
      tenantId: tenant._id,
      authUserId: authUser._id,
      email: normalizedEmail,
      password: hashedPassword,
      name: ownerName.trim(),
      phone: phone?.trim() ?? "",
      role: "OWNER",
      isEmailVerified: false,
      verificationToken,
      verificationTokenExpiry,
      status: "active",
    });
    await tenantUser.save();

    // 4. Subscription — free plan, trialing
    const trialDays = parseInt(
      process.env.DEFAULT_TRIAL_DAYS ?? String(TRIAL_DAYS),
    );
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    await Subscription.create({
      tenantId: tenant._id,
      plan: "maria",
      status: "trialing",
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEndsAt,
      cancelAtPeriodEnd: false,
    });

    // 5. Legacy presentation profile. Education tenant ga privremeno koristi
    //    zato što Theme sistem i dalje zavisi od SalonProfile; ovo NE znači da
    //    Education domen pripada salon domenu i model se sada ne preimenuje.
    const salonProfile = new SalonProfile({
      tenantId: tenant._id,
      name: businessName,
      email: normalizedEmail,
      phone: phone?.trim() ?? "",
      description: "",
    });
    await salonProfile.save();

    tenant.salonProfileId = salonProfile._id as Parameters<
      typeof tenant.set
    >[1];
    await tenant.save();

    // 6. Newsletter opt-in (optional) — create a platform-level SALON_OWNER
    //    contact, pending until the registration email link is verified.
    if (newsletterOptIn) {
      try {
        await upsertOwnerNewsletterContact({
          email: normalizedEmail,
          name: ownerName.trim(),
          profileId: tenantUser._id,
        });
      } catch (newsletterErr) {
        console.error("⚠️ Newsletter opt-in nije sačuvan:", newsletterErr);
      }
    }

    // 7. Verification email
    try {
      await sendOwnerVerificationEmail({
        email: normalizedEmail,
        ownerName: ownerName.trim(),
        salonName: businessName,
        verificationToken,
        subdomain,
      });
    } catch (emailErr) {
      console.error("⚠️ Verifikacioni email nije poslat:", emailErr);
    }

    // 8. Superadmin mora da sazna da neko čeka aktivaciju. `await` je nameran —
    //    fire-and-forget na serverless-u ume da bude prekinut pre slanja.
    //    Funkcija nikad ne baca, pa ne može da obori registraciju.
    await notifySuperAdminsOfTenantRegistration({
      tenantId: tenant._id,
      salonName: businessName,
      ownerName: ownerName.trim(),
      ownerEmail: normalizedEmail,
      subdomain,
    });

    return NextResponse.json(
      {
        message: `Biznis je registrovan! Proverite email ${normalizedEmail} za potvrdu.`,
        slug,
        subdomain,
        preset,
        trialDays: TRIAL_DAYS,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ Tenant registration error:", error);

    // Roll back anything created before the failure so the owner can retry
    // without hitting "Nalog već postoji" (409) on a half-finished account.
    try {
      if (createdTenantId) {
        await Promise.all([
          Subscription.deleteMany({ tenantId: createdTenantId }),
          SalonProfile.deleteMany({ tenantId: createdTenantId }),
          TenantUser.deleteMany({ tenantId: createdTenantId }),
          Tenant.deleteOne({ _id: createdTenantId }),
        ]);
      }
      if (createdAuthUserId) {
        await AuthUser.deleteOne({ _id: createdAuthUserId });
      }
    } catch (rollbackErr) {
      console.error(
        "⚠️ Rollback after failed registration incomplete:",
        rollbackErr,
      );
    }

    return NextResponse.json(
      { error: "Greška pri registraciji. Pokušajte ponovo." },
      { status: 500 },
    );
  }
}
