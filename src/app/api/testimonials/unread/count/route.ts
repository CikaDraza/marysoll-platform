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

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // BROJ NEPROČITANIH = komentari bez adminReply i bez oznake isRead
    const unreadCount = await Testimonial.countDocuments({
      adminReply: { $exists: false },
      isRead: false,
    });

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json(
      { error: "Error fetching unread count" },
      { status: 500 },
    );
  }
}
