import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { verifyToken } from "@/lib/auth/auth-server";
import { Testimonial } from "@/models/Testimonial";

export async function GET(req: Request) {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token);

    if (!user || user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Broj nepročitanih komentara SA ODGOVOROM za klijenta
    const unreadClientCount = await Testimonial.countDocuments({
      clientEmail: user.email,
      adminReply: { $exists: true, $ne: "" },
      isRead: true,
      isClientRead: false,
    });

    return NextResponse.json({ unreadClientCount });
  } catch (error) {
    console.error("Error fetching client unread count:", error);
    return NextResponse.json(
      { error: "Error fetching client unread count" },
      { status: 500 },
    );
  }
}
