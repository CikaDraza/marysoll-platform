// app/api/users/status/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { verifyToken, getTokenFromRequest } from "@/lib/auth/auth-server";

export async function POST(req: Request) {
  try {
    await connectToDB();

    // Accept the token from Authorization header OR auth cookie. The cookie
    // path matters for navigator.sendBeacon on beforeunload, which cannot set
    // custom headers — without it, authenticated unload calls 401 spuriously.
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    if (!decoded.tenantUserId) {
      return NextResponse.json({ success: true });
    }

    // `beforeunload` beacon stiže dok se stranica ruši, pa browser ume da
    // prekine telo zahteva u letu (ECONNRESET). Tada nema šta da se upiše —
    // to je normalan kraj sesije, ne greška servera, pa ne sme da bude 500.
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ success: true, skipped: "empty_body" });
    }

    const { isOnline } = (payload ?? {}) as { isOnline?: unknown };
    if (typeof isOnline !== "boolean") {
      return NextResponse.json(
        { error: "isOnline mora biti boolean" },
        { status: 400 },
      );
    }

    const updatedUser = await TenantUser.findByIdAndUpdate(
      decoded.tenantUserId,
      {
        isOnline,
        lastActive: new Date(),
      },
      { new: true },
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Status updated",
      user: {
        id: updatedUser._id,
        isOnline: updatedUser.isOnline,
        lastActive: updatedUser.lastActive,
      },
    });
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
