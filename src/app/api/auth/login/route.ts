import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth/auth-server";

export async function POST(request: NextRequest) {
  try {
    await connectToDB();
    const { email, password } = await request.json();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: "Korisnik nije pronađen" },
        { status: 404 },
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Pogrešna lozinka" }, { status: 401 });
    }

    if (!user.isEmailVerified) {
      return NextResponse.json(
        {
          error:
            "Email nije verifikovan. Proverite inbox ili zatražite novi link.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 401 },
      );
    }

    await User.findByIdAndUpdate(user._id, {
      isOnline: true,
      lastActive: new Date(),
    });

    const tenantId = user.tenantId?.toString() ?? null;

    const accessToken = generateAccessToken(
      user._id.toString(),
      user.email,
      user.isAdmin,
      user.name ?? user.email.split("@")[0],
      tenantId,
      user.isSuperAdmin ?? false,
    );
    const refreshToken = generateRefreshToken(
      user._id.toString(),
      user.email,
      user.isAdmin,
      tenantId,
      user.isSuperAdmin ?? false,
    );

    const isProd = process.env.NODE_ENV === "production";
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

    const response = NextResponse.json({
      message: "Prijava uspešna",
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin ?? false,
        tenantId,
        isOnline: true,
        lastActive: new Date(),
      },
    });

    // refreshToken cookie: dostupan na SVIM subdomenima (.marysoll.com)
    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax", // lax umesto strict — dozvoljava cross-subdomain
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      domain: isProd ? `.${baseDomain}` : undefined, // .marysoll.com — shared
    });

    // accessToken cookie: čitljiv JS-om, shared across subdomains
    response.cookies.set("auth-token", accessToken, {
      httpOnly: false, // JS može da ga čita
      secure: isProd,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      domain: isProd ? `.${baseDomain}` : undefined,
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
