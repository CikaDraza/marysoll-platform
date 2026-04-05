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
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { Tenant } from "@/models/Tenant";
import { AudienceContact } from "@/models/AudienceContact";
import { sendClientVerificationEmail } from "@/lib/email/onboarding";
import toast from "react-hot-toast";

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

    const existingUser = await User.findOne({ email: normalizedEmail });

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      if (existingUser.userType === "legal") {
        return NextResponse.json(
          { error: "Korisnik sa ovom email adresom već postoji." },
          { status: 400 },
        );
      }
      // Gost koji je zakazivao termin — upgrejduj nalog
      existingUser.name = name.trim();
      existingUser.password = hashedPassword;
      existingUser.phone = phone?.trim() ?? existingUser.phone;
      existingUser.agreedToPrivacy = true;
      existingUser.userType = "legal";
      existingUser.isEmailVerified = false;
      existingUser.verificationToken = verificationToken;
      existingUser.verificationTokenExpiry = verificationTokenExpiry;

      if (tenant && !existingUser.tenantId) {
        existingUser.tenantId = tenant._id as import("mongoose").Types.ObjectId;
      }
      await existingUser.save();
    } else {
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
        tenantId: tenant?._id ?? null,
        isOnline: true,
        lastActive: new Date(),
      });
      await newUser.save();
    }

    // Kreiraj ili ažuriraj AudienceContact entry
    const savedUser =
      existingUser ?? (await User.findOne({ email: normalizedEmail }));
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

    // Pošalji verifikacioni email
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
    toast.error(error instanceof Error ? error.message : "Greška na serveru");
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
