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

    // REŠENJE: Inicijalizujemo prazan filter.
    // Pošto smo gore već proverili da je user.isAdmin, ne moramo dodavati userId u query.
    let query: FilterQuery<INotification> = {};

    // Ako želiš da Admin može da obriše samo SVOJE, ovde bi dodao query.userId = user.id
    // Ali pošto želiš "Globalno" brisanje iz admin panela, ostavljamo prazno da obuhvati sve korisnike.

    if (mode === "old") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.createdAt = { $lt: thirtyDaysAgo };
    }

    // Ako je mode "all", query ostaje {}, što znači brisanje cele kolekcije
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
