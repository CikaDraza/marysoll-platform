import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { Testimonial } from "@/models/Testimonial";
import { Types } from "mongoose";

export async function PUT(req: Request) {
  try {
    await connectToDB();

    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!decoded.tenantId) {
      return NextResponse.json({ error: "Forbidden: no tenant context" }, { status: 403 });
    }

    const result = await Testimonial.updateMany(
      { tenantId: new Types.ObjectId(decoded.tenantId), isRead: false },
      { $set: { isRead: true } },
    );

    return NextResponse.json({ updatedCount: result.modifiedCount });
  } catch (error) {
    console.error("Error marking all testimonials as read:", error);
    return NextResponse.json(
      { error: "Error marking testimonials as read" },
      { status: 500 },
    );
  }
}
