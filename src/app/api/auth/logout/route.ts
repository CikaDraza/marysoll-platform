import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { verifyToken } from "@/lib/auth/auth-server";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const user = verifyToken(token);

      if (user?.tenantUserId) {
        await TenantUser.findByIdAndUpdate(user.tenantUserId, {
          isOnline: false,
          lastActive: new Date(),
        });
      }
    }

    const isProd = process.env.NODE_ENV === "production";
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

    const res = NextResponse.json({ message: "Odjavljen" });

    // Tenant cookies — scoped to current domain only
    res.cookies.set("tenant-access-token", "", {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    res.cookies.set("tenant-refresh-token", "", {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    // Platform cookies — scoped to .marysoll.com
    res.cookies.set("platform-access-token", "", {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
      domain: isProd ? `.${baseDomain}` : undefined,
    });
    res.cookies.set("platform-refresh-token", "", {
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
