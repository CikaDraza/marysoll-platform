import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { Notification } from "@/models/Notification";
import { NextRequest } from "next/server";
import { FilterQuery } from "mongoose";
import { INotification } from "@/types";

export async function DELETE(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  await connectToDB();

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");

  const query: FilterQuery<INotification> = {
    recipientProfileId: auth.decoded.id,
  };

  if (mode === "old") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query.createdAt = { $lt: thirtyDaysAgo };
  }

  const result = await Notification.deleteMany(query);

  return NextResponse.json({ success: true, deletedCount: result.deletedCount });
}
