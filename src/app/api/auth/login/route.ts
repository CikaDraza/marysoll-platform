import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth/auth-server";

const SUPPORT_LINK = "https://marysoll.com/kontakt";

export async function POST(request: NextRequest) {
  try {
    await connectToDB();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email i lozinka su obavezni." },
        { status: 400 },
      );
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json(
        {
          error: "Korisnik sa ovom email adresom nije pronađen.",
          hint: `Kontaktirajte podršku: ${SUPPORT_LINK}`,
        },
        { status: 404 },
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Pogrešna lozinka. Pokušajte ponovo ili resetujte lozinku." },
        { status: 401 },
      );
    }

    if (!user.isEmailVerified) {
      return NextResponse.json(
        {
          error:
            "Email adresa nije verifikovana. Proverite inbox ili zatražite novi verifikacioni link.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 401 },
      );
    }

    // Verify globalRole is set — guard against stale documents
    const allowedRoles = ["SUPER_ADMIN", "OWNER", "ADMIN", "STAFF", "USER"];
    if (!allowedRoles.includes(user.globalRole ?? "")) {
      return NextResponse.json(
        {
          error: "Vaš nalog nema ispravno podešenu rolu. Kontaktirajte podršku.",
          hint: SUPPORT_LINK,
          code: "INVALID_ROLE",
        },
        { status: 403 },
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
      user.globalRole ?? "USER",
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
        globalRole: user.globalRole ?? "USER",
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
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      domain: isProd ? `.${baseDomain}` : undefined,
    });

    // accessToken cookie: čitljiv JS-om, shared across subdomains
    response.cookies.set("auth-token", accessToken, {
      httpOnly: false,
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
