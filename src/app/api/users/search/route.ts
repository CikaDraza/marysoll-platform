import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";

interface UserFilter {
  $or?: Array<{ [key: string]: { $regex: RegExp } }>;
  isAdmin?: boolean;
  createdAt?: {
    $gte: Date;
    $lte: Date;
  };
}

export async function GET(req: Request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() ?? "";
    const date = searchParams.get("date")?.trim() ?? "";

    const filter: UserFilter = {
      isAdmin: false, // ❗ ne vraćaj admina nikad
    };

    // 🔍 Pretraga po name i email
    if (query) {
      const regex = new RegExp(query, "i");
      filter.$or = [{ name: { $regex: regex } }, { email: { $regex: regex } }];
    }

    // 🔍 Pretraga po datumu kreiranja
    if (date) {
      // createdAt je ISO → filtriramo po početku dana i kraju dana
      const start = new Date(date + "T00:00:00.000Z");
      const end = new Date(date + "T23:59:59.999Z");

      filter.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    return NextResponse.json(users);
  } catch (error) {
    console.error("User search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
