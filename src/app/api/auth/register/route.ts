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
import { sendClientVerificationEmail } from "@/lib/email/onboarding";

export async function POST(req: NextRequest) {
  try {
    await connectToDB();

    const { name, email, password, phone, agreedToPrivacy } = await req.json();

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

    // Nađi tenant iz headera (middleware ubacuje x-tenant-slug)
    const tenantSlug = req.headers.get("x-tenant-slug");
    let tenant = null;
    let salonName = "salon";
    let salonBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
        existingUser.tenantId = tenant._id as Parameters<
          typeof existingUser.set
        >[1];
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

    // Pošalji verifikacioni email
    try {
      await sendClientVerificationEmail({
        email: normalizedEmail,
        clientName: name.trim(),
        salonName,
        verificationToken,
        salonBaseUrl,
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
