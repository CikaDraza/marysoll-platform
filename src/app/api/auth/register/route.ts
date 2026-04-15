/**
 * POST /api/auth/register
 *
 * Registers a CLIENT on a specific tenant (salon).
 * Tenant-isolated: each salon has its own user system.
 *
 * Same email CAN exist on different tenants with different passwords.
 * Uniqueness enforced only within { tenantId, email }.
 *
 * No AuthUser is created — clients live in TenantUser only.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { Tenant } from "@/models/Tenant";
import { AudienceContact } from "@/models/AudienceContact";
import { sendClientVerificationEmail } from "@/lib/email/onboarding";

export async function POST(req: NextRequest) {
  try {
    await connectToDB();

    const {
      name,
      email,
      password,
      phone,
      agreedToPrivacy,
      tenantSlug: bodyTenantSlug,
    } = await req.json();

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

    // Resolve tenant from header (middleware) or body (path-based routing fallback)
    const tenantSlug = req.headers.get("x-tenant-slug") || bodyTenantSlug || null;

    if (!tenantSlug || tenantSlug === "default") {
      return NextResponse.json(
        { error: "Registracija zahteva kontekst salona." },
        { status: 400 },
      );
    }

    const tenant = await Tenant.findOne({ slug: tenantSlug, status: "active" });
    if (!tenant) {
      return NextResponse.json(
        { error: "Salon nije pronađen ili nije aktivan." },
        { status: 404 },
      );
    }

    // ── Check for existing account on THIS tenant only ─────────────────────
    const existing = await TenantUser.findOne({
      tenantId: tenant._id,
      email: normalizedEmail,
    });

    if (existing) {
      if (existing.isEmailVerified) {
        // Tenant-scoped block: this email is already registered on this salon.
        return NextResponse.json(
          { error: "Korisnik sa ovom email adresom već postoji u ovom salonu." },
          { status: 400 },
        );
      } else {
        // Not yet verified — resend the verification email.
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        existing.verificationToken = verificationToken;
        existing.verificationTokenExpiry = verificationTokenExpiry;
        await existing.save();

        try {
          await sendClientVerificationEmail({
            email: normalizedEmail,
            clientName: existing.name,
            salonName: tenant.name,
            verificationToken,
            salonBaseUrl: `https://${tenant.slug}.marysoll.com`,
            tenantId: tenant._id.toString(),
          });
        } catch (e) {
          console.error("⚠️ Resend verification email failed:", e);
        }

        return NextResponse.json(
          { message: "Verifikacioni email je ponovo poslat. Proverite inbox." },
          { status: 200 },
        );
      }
    }

    // ── New user — create TenantUser directly ─────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const tenantUser = await TenantUser.create({
      tenantId: tenant._id,
      email: normalizedEmail,
      password: hashedPassword,
      name: name.trim(),
      phone: phone?.trim() ?? "",
      role: "USER",
      authUserId: null,
      isEmailVerified: false,
      verificationToken,
      verificationTokenExpiry,
      status: "active",
    });

    // ── AudienceContact (newsletter list) ────────────────────────────────
    try {
      await AudienceContact.findOneAndUpdate(
        { email: normalizedEmail, tenantId: tenant._id },
        {
          $setOnInsert: {
            email: normalizedEmail,
            profileId: tenantUser._id,
            tenantId: tenant._id,
            contactType: "CLIENT",
            source: "user",
            subscribed: true,
            status: "ACTIVE",
          },
        },
        { upsert: true },
      );
    } catch (e) {
      console.error("⚠️ AudienceContact upsert failed:", e);
    }

    // ── Send verification email ───────────────────────────────────────────
    try {
      await sendClientVerificationEmail({
        email: normalizedEmail,
        clientName: name.trim(),
        salonName: tenant.name,
        verificationToken,
        salonBaseUrl: `https://${tenant.slug}.marysoll.com`,
        tenantId: tenant._id.toString(),
      });
    } catch (e) {
      console.error("⚠️ Client verification email failed:", e);
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
