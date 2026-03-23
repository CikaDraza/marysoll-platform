import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth/auth-server";

export async function POST(req: Request) {
  try {
    await connectToDB();

    // Proveri token iz Authorization headera
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const user = verifyToken(token);

      if (user) {
        // ✅ Ažuriraj online status na false i lastActive
        await User.findByIdAndUpdate(user.id, {
          isOnline: false,
          lastActive: new Date(),
        });
      }
    }

    const isProd = process.env.NODE_ENV === "production";
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

    const res = NextResponse.json({ message: "Odjavljen" });

    // Očisti sve cookie varijante (lokalni i shared)
    const cookieOptions = {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax" as const,
      maxAge: 0,
      path: "/",
    };

    res.cookies.set("token", "", cookieOptions);
    res.cookies.set("auth-token", "", cookieOptions);
    res.cookies.set("auth-token", "", {
      ...cookieOptions,
      domain: isProd ? `.${baseDomain}` : undefined,
    });
    res.cookies.set("refreshToken", "", {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    res.cookies.set("refreshToken", "", {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
      domain: isProd ? `.${baseDomain}` : undefined,
    });

    return res;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
