import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth/auth-server";

export async function GET(req: Request) {
  try {
    await connectToDB();

    // Provera tokena iz Authorization headera
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        {
          error: "Invalid or expired token",
        },
        { status: 401 }
      );
    }
    const user = await User.findById(decoded.id, { password: 0 });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: unknown) {
    console.error("Error fetching user:", {
      error: error instanceof Error && error.message,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error fetching user" },
      { status: 500 }
    );
  }
}
