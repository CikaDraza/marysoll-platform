import { deleteFromCloudinary } from "@/lib/cloudinary";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "Missing URL" }, { status: 400 });
    }

    await deleteFromCloudinary(url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete image error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
