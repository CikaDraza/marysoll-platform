// api/notifications/delete/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { verifyToken } from "@/lib/auth/auth-server";
import { FilterQuery } from "mongoose";
import { INotification } from "@/types";
import { Notification } from "@/models/Notification";

export async function DELETE(req: Request) {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    const user = verifyToken(token!);

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");

    // Ovaj endpoint je recipient-scoped i za SUPER_ADMIN-a: platformska uloga
    // ne daje pravo da se kroz lično notification zvono brišu tuđi zapisi.
    const query: FilterQuery<INotification> = {
      recipientProfileId: user.tenantUserId ?? user.id,
    };

    // Recipient je authority; tenantId je dodatna granica kada ga verifikovani
    // token pouzdano nosi (platformski SUPER_ADMIN token ga nema).
    if (user.tenantId) {
      query.tenantId = user.tenantId;
    }

    if (mode === "old") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.createdAt = { $lt: thirtyDaysAgo };
    }

    const result = await Notification.deleteMany(query);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
