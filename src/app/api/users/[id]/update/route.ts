import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { verifyToken } from "@/lib/auth/auth-server";
import { normalizeInstagram } from "@/lib/contactRules";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDB();

    const { id } = await context.params;

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Klijent sme da ažurira SOPSTVENI profil; ostale profile samo admin.
    const isSelf = decoded.tenantUserId === id;
    if (!isSelf && !decoded.isAdmin && !decoded.isSuperAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // id = TenantUser._id
    const targetUser = await TenantUser.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Non-superadmin cannot modify OWNER/ADMIN accounts (except their own)
    if (
      ["OWNER", "ADMIN"].includes(targetUser.role) &&
      !decoded.isSuperAdmin &&
      decoded.tenantUserId !== id
    ) {
      return NextResponse.json(
        { error: "Only superadmin can update admin users" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { name, password, phone, birthday, instagram } = body;

    const profileUpdate: Record<string, unknown> = {};
    if (name !== undefined) profileUpdate.name = name;
    if (phone !== undefined) profileUpdate.phone = phone;
    if (birthday !== undefined) {
      const parsed = birthday ? new Date(birthday) : null;
      profileUpdate.birthday = parsed && !isNaN(parsed.getTime()) ? parsed : null;
    }
    if (instagram !== undefined) {
      profileUpdate.instagram = normalizeInstagram(instagram) || null;
    }

    // Password is now on TenantUser directly
    if (password && password.trim() !== "") {
      profileUpdate.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    if (Object.keys(profileUpdate).length > 0) {
      await TenantUser.findByIdAndUpdate(id, { $set: profileUpdate });
    }

    const updated = await TenantUser.findById(id)
      .select("-pushSubscriptions -password")
      .lean();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      {
        error: "Error updating user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
