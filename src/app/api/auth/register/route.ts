/**
 * POST /api/auth/register
 *
 * Registracija KLIJENTA salona (nije vlasnik).
 * Klijent se registruje na stranici konkretnog salona.
 * tenantId se čita iz x-tenant-slug headera (injektuje middleware).
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { UserIdentity } from "@/models/UserIdentity";
import { Tenant } from "@/models/Tenant";
import { AudienceContact } from "@/models/AudienceContact";
import { resolveOrCreateIdentity } from "@/lib/auth/identity";
import { sendClientVerificationEmail } from "@/lib/email/onboarding";

export async function POST(req: NextRequest) {
  try {
    await connectToDB();

    const { name, email, password, phone, agreedToPrivacy, tenantSlug: bodyTenantSlug } = await req.json();

    if (!name || !email || !password || !agreedToPrivacy) {
      return NextResponse.json(
        { error: "Sva polja su obavezna." },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Lozinka mora imati najmanje 8 karaktera." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Nađi tenant: header (middleware) ili body (path-based routing fallback)
    const tenantSlug = req.headers.get("x-tenant-slug") || bodyTenantSlug || null;
    let tenant = null;
    let salonName = "salon";
    let salonBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3006";

    if (tenantSlug && tenantSlug !== "default") {
      tenant = await Tenant.findOne({ slug: tenantSlug, status: "active" });
      if (tenant) {
        salonName = tenant.name;
        salonBaseUrl = `https://${tenant.slug}.marysoll.com`;
      }
    }

    // Scope the lookup to this tenant — same email is allowed on different tenants.
    const tenantFilter = tenant
      ? { email: normalizedEmail, tenantId: tenant._id }
      : { email: normalizedEmail, tenantId: null };
    const existingUser = await User.findOne(tenantFilter);

    if (existingUser?.userType === "legal") {
      return NextResponse.json(
        { error: "Korisnik sa ovom email adresom već postoji." },
        { status: 400 },
      );
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Guest upgrade path ──────────────────────────────────────────────────────
    // resolveOrCreateIdentity uses $setOnInsert — it will NOT overwrite an existing
    // User document. A guest account that booked an appointment must be upgraded
    // directly here, before the identity chain is resolved.

    if (existingUser) {
      existingUser.name = name.trim();
      existingUser.password = hashedPassword;
      existingUser.phone = phone?.trim() ?? existingUser.phone;
      existingUser.agreedToPrivacy = true;
      existingUser.userType = "legal";
      existingUser.isEmailVerified = false;
      existingUser.verificationToken = verificationToken;
      existingUser.verificationTokenExpiry = verificationTokenExpiry;
      if (tenant && !existingUser.tenantId) {
        existingUser.tenantId = tenant._id as Types.ObjectId;
      }
      await existingUser.save();
    }

    // ── Identity chain ──────────────────────────────────────────────────────────
    // resolveOrCreateIdentity atomically resolves or creates:
    //   UserIdentity  — global, one per email across the entire platform
    //   TenantProfile — per-tenant, one per (identityId × tenantId) pair
    //   User          — legacy document; $setOnInsert is a no-op for guest upgrade
    //
    // TenantProfile requires a real tenantId — tenantless registrations fall back
    // to a direct User create and a non-blocking UserIdentity dual-write.

    let savedUser = existingUser;

    if (tenant) {
      const { legacyUser } = await resolveOrCreateIdentity(
        normalizedEmail,
        hashedPassword,
        tenant._id as Types.ObjectId,
        {
          name: name.trim(),
          phone: phone?.trim() ?? "",
          agreedToPrivacy: true,
          isEmailVerified: false,
          verificationToken,
          verificationTokenExpiry,
        },
      );
      if (!existingUser) {
        // New user: all three layers just created — use the returned User doc.
        savedUser = legacyUser;
      }
      // Guest upgrade: existingUser already saved above; legacyUser $setOnInsert
      // was a no-op. Keep savedUser = existingUser.
    } else {
      // Tenantless fallback — TenantProfile cannot exist without a tenant.
      if (!existingUser) {
        const newUser = new User({
          name: name.trim(),
          email: normalizedEmail,
          phone: phone?.trim() ?? "",
          password: hashedPassword,
          agreedToPrivacy: true,
          isAdmin: false,
          isSuperAdmin: false,
          isEmailVerified: false,
          verificationToken,
          verificationTokenExpiry,
          userType: "legal",
          tenantId: null,
          isOnline: true,
          lastActive: new Date(),
        });
        await newUser.save();
        savedUser = newUser;
      }
      // Non-blocking UserIdentity dual-write for the tenantless path.
      try {
        await UserIdentity.findOneAndUpdate(
          { email: normalizedEmail },
          {
            $setOnInsert: {
              email: normalizedEmail,
              passwordHash: hashedPassword,
              isEmailVerified: false,
              legacyUserId: null,
            },
          },
          { upsert: true, new: false, setDefaultsOnInsert: true },
        );
      } catch (identityErr) {
        console.error("⚠️ UserIdentity sync failed (tenantless path):", identityErr);
      }
    }

    // ── AudienceContact ─────────────────────────────────────────────────────────
    if (savedUser) {
      try {
        await AudienceContact.findOneAndUpdate(
          { email: normalizedEmail, tenantId: tenant?._id ?? null },
          {
            $setOnInsert: {
              email: normalizedEmail,
              userId: savedUser._id,
              tenantId: tenant?._id ?? undefined,
              contactType:
                savedUser.globalRole === "OWNER" ? "SALON_OWNER" : "CLIENT",
              source: "user",
              subscribed: true,
              status: "ACTIVE",
            },
          },
          { upsert: true },
        );
      } catch (contactErr) {
        console.error("⚠️ AudienceContact upsert failed:", contactErr);
      }
    }

    // ── Verification email ──────────────────────────────────────────────────────
    try {
      await sendClientVerificationEmail({
        email: normalizedEmail,
        clientName: name.trim(),
        salonName,
        verificationToken,
        salonBaseUrl,
        tenantId: tenant?._id?.toString() ?? null,
      });
    } catch (emailErr) {
      console.error("⚠️ Client verification email nije poslat:", emailErr);
    }

    return NextResponse.json(
      { message: "Registracija uspešna. Proverite email za verifikaciju." },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ Register error:", error);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
