// app/api/salon-profile/update-seo/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { verifyToken } from "@/lib/auth/auth-server";

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : request.headers.get("cookie")?.match(/auth-token=([^;]+)/)?.[1];

    if (!token) {
      return NextResponse.json({ error: "Nema tokena" }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Neovlašćen pristup" },
        { status: 401 },
      );
    }

    await connectToDB();
    const body = await request.json();

    const profile = await SalonProfile.findOne();
    if (!profile) {
      return NextResponse.json(
        { error: "Salon profil ne postoji" },
        { status: 404 },
      );
    }

    profile.seo = {
      ...(profile.seo || {}),
      ...body,
    };

    await profile.save();

    return NextResponse.json({ success: true, data: profile });
  } catch (err) {
    console.error("SEO Update Error:", err);
    return NextResponse.json({ error: "Server greška" }, { status: 500 });
  }
}
