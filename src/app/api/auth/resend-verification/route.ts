import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { Tenant } from "@/models/Tenant";
import { sendOwnerVerificationEmail, sendClientVerificationEmail } from "@/lib/email/onboarding";

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email je obavezan." }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Uvek vraćamo 200 da ne otkrivamo da li email postoji
    if (!user || user.isEmailVerified) {
      return NextResponse.json({
        message: "Ako email postoji i nije verifikovan, novi link je poslat.",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    if (user.isAdmin) {
      // Vlasnik salona
      const tenant = await Tenant.findOne({ ownerId: user._id });
      await sendOwnerVerificationEmail({
        email: user.email,
        ownerName: user.name,
        salonName: tenant?.name ?? "Salon",
        verificationToken,
        subdomain: tenant ? `${tenant.slug}.marysoll.com` : "",
      });
    } else {
      // Klijent
      let salonName = "salon";
      let salonBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      if (user.tenantId) {
        const tenant = await Tenant.findById(user.tenantId);
        if (tenant) {
          salonName = tenant.name;
          salonBaseUrl = `https://${tenant.slug}.marysoll.com`;
        }
      }
      await sendClientVerificationEmail({
        email: user.email,
        clientName: user.name,
        salonName,
        verificationToken,
        salonBaseUrl,
        tenantId: user.tenantId?.toString() ?? null,
      });
    }

    return NextResponse.json({
      message: "Ako email postoji i nije verifikovan, novi link je poslat.",
    });
  } catch (error) {
    console.error("❌ Resend verification error:", error);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}
