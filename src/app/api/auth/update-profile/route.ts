import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";

/**
 * PATCH /api/auth/update-profile
 * Body: { name?: string; phone?: string; marketingPhone?: string; newsletterEmail?: string; contactEmail?: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    await connectToDB();
    const auth = (await requireAuth(req)) as
      | { decoded: DecodedToken }
      | NextResponse;
    if (auth instanceof NextResponse) return auth;

    const { name, phone, marketingPhone, newsletterEmail, contactEmail } =
      await req.json();

    const update: Record<string, string> = {};
    if (name?.trim()) update.name = name.trim();
    if (phone?.trim()) update.phone = phone.trim();
    if (typeof marketingPhone === "string")
      update.marketingPhone = marketingPhone.trim();
    if (typeof newsletterEmail === "string")
      update.newsletterEmail = newsletterEmail.trim();
    if (typeof contactEmail === "string")
      update.contactEmail = contactEmail.trim();

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    const user = await User.findByIdAndUpdate(
      auth.decoded.id,
      { $set: update },
      { new: true, select: "name phone marketingPhone newsletterEmail contactEmail email globalRole" },
    ).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error("PATCH /api/auth/update-profile:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
