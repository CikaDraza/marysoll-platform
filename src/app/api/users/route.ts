import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { getServerSession } from "next-auth";

export async function GET() {
  try {
    await connectToDB();
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const users = await User.find({ isAdmin: false }, { password: 0 }).sort({
      name: 1,
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Error fetching users" },
      { status: 500 },
    );
  }
}
