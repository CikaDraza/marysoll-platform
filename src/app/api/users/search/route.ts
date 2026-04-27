import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { Types } from "mongoose";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";

export async function GET(req: Request) {
  try {
    await connectToDB();

    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });

    if (!decoded.isAdmin && !decoded.isSuperAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (!decoded.tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() ?? "";
    const date = searchParams.get("date")?.trim() ?? "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      tenantId: new Types.ObjectId(decoded.tenantId),
      role: { $nin: ["OWNER", "ADMIN"] },
    };

    if (query) {
      const regex = new RegExp(query, "i");
      filter.$or = [
        { name: { $regex: regex } },
        { email: { $regex: regex } },
      ];
    }

    if (date) {
      const start = new Date(date + "T00:00:00.000Z");
      const end = new Date(date + "T23:59:59.999Z");
      filter.createdAt = { $gte: start, $lte: end };
    }

    const users = await TenantUser.find(filter, {
      _id: 1,
      name: 1,
      email: 1,
      phone: 1,
      role: 1,
      isOnline: 1,
      isEmailVerified: 1,
      lastActive: 1,
      createdAt: 1,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(users);
  } catch (error) {
    console.error("User search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
