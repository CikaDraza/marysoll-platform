import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth/auth-server";

export async function POST(req: Request) {
  try {
    await connectToDB();

    // Proveri token iz Authorization headera
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const user = verifyToken(token);

      if (user) {
        // ✅ Ažuriraj online status na false i lastActive
        await User.findByIdAndUpdate(user.id, {
          isOnline: false,
          lastActive: new Date(),
        });
      }
    }

    const res = NextResponse.json({ message: "Odjavljen" });

    // Očisti cookies
    res.cookies.set("token", "", { maxAge: 0, path: "/" });
    res.cookies.set("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0, // Istekao
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
