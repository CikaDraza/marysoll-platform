import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { User } from "@/models/User";
import { SalonProfile } from "@/models/SalonProfile";
import { sendOwnerVerificationEmail, TRIAL_DAYS } from "@/lib/email/onboarding";
import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * POST /api/tenants/register
 *
 * Kreira: User (isAdmin) + Tenant (pending) + SalonProfile
 * Šalje: verifikacioni email vlasniku
 * Trial se aktivira TEK posle verifikacije emaila.
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDB();

    const { salonName, ownerName, email, password, phone, agreedToPrivacy } =
      await request.json();

    if (!salonName || !ownerName || !email || !password || !phone || !agreedToPrivacy) {
      return NextResponse.json({ error: "Sva polja su obavezna" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Lozinka mora imati najmanje 8 karaktera" },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Unesite ispravnu email adresu" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "Nalog sa ovim emailom već postoji" },
        { status: 409 }
      );
    }

    // Generisanje jedinstvenog slug-a (čisti dijakritike)
    const baseSlug = salonName
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

    const subdomain = `${slug}.marysoll.com`;

    // Verifikacioni token — crypto random, ne JWT (kraći, sigurniji za ovu namenu)
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 1. Kreiraj vlasnika
    const hashedPassword = await bcrypt.hash(password, 12);
    const owner = new User({
      name: ownerName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone?.trim() ?? "",
      isAdmin: true,
      isSuperAdmin: false,
      agreedToPrivacy: true,
      isEmailVerified: false,
      verificationToken,
      verificationTokenExpiry,
      userType: "legal",
      isOnline: false,
      lastActive: new Date(),
    });
    await owner.save();

    // 2. Kreiraj tenant — status "pending", trial NE počinje jos
    const tenant = new Tenant({
      name: salonName.trim(),
      slug,
      subdomain: slug,
      customDomain: null,
      customDomainVerified: false,
      paid: false,
      verified: false,
      plan: "free",
      planExpiresAt: null,
      trialEndsAt: null,
      isTrialActive: false,
      ownerId: owner._id,
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

    // 3. Povezi user sa tenantom
    owner.tenantId = tenant._id as Parameters<typeof owner.set>[1];
    await owner.save();

    // 4. Prazan profil salona
    const salonProfile = new SalonProfile({
      tenantId: tenant._id,
      name: salonName.trim(),
      email: normalizedEmail,
      phone: phone?.trim() ?? "",
      description: "",
    });
    await salonProfile.save();

    tenant.salonProfileId = salonProfile._id as Parameters<typeof tenant.set>[1];
    await tenant.save();

    // 5. Verifikacioni email — ne blokira registraciju ako ne uspe
    try {
      await sendOwnerVerificationEmail({
        email: normalizedEmail,
        ownerName: ownerName.trim(),
        salonName: salonName.trim(),
        verificationToken,
        subdomain,
      });
    } catch (emailErr) {
      console.error("⚠️ Verifikacioni email nije poslat:", emailErr);
    }

    return NextResponse.json(
      {
        message: `Salon je registrovan! Proverite email ${normalizedEmail} za potvrdu.`,
        slug,
        subdomain,
        trialDays: TRIAL_DAYS,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Tenant registration error:", error);
    return NextResponse.json(
      { error: "Greška pri registraciji. Pokušajte ponovo." },
      { status: 500 }
    );
  }
}
