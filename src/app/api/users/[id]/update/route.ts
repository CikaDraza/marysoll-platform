import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { UserIdentity } from "@/models/UserIdentity";
import { verifyToken } from "@/lib/auth/auth-server";
import bcrypt from "bcryptjs";
import { IUser } from "@/types";

const SALT_ROUNDS = 12;

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDB();

    const { id } = await context.params;

    // Provera tokena iz Authorization headera
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        {
          error: "Invalid or expired token",
        },
        { status: 401 },
      );
    }

    // Pronađi trenutnog korisnika (admina)
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        { status: 404 },
      );
    }

    // Pronađi target korisnika
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        { status: 404 },
      );
    }

    // Admin ne može da menja podatke drugog admina (osim superadmin)
    if (
      targetUser.isAdmin &&
      currentUser.id !== targetUser.id &&
      !currentUser.isSuperAdmin
    ) {
      return NextResponse.json(
        { error: "Only superadmin can update admin users" },
        { status: 403 },
      );
    }

    // Pročitaj telo zahteva
    const body = await req.json();
    const { name, password, phone, birthday } = body;

    // Ažuriraj samo dozvoljena polja
    const updateData: Partial<IUser> = {};

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (birthday !== undefined) {
      updateData.birthday = birthday ? new Date(birthday) : null;
    }

    // Ažuriraj lozinku samo ako je data
    let hashedPassword: string | undefined;
    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      updateData.password = hashedPassword;
    }

    // Izvrši update
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, projection: { password: 0 } },
    );

    if (!updatedUser) {
      return NextResponse.json(
        {
          error: "User not found during update",
        },
        { status: 404 },
      );
    }

    // Passive sync — only runs when password was actually changed.
    // No upsert: if UserIdentity is absent (pre-migration account), do nothing.
    if (hashedPassword) {
      try {
        await UserIdentity.findOneAndUpdate(
          { legacyUserId: id },
          { passwordHash: hashedPassword },
        );
      } catch (identityErr) {
        console.error("⚠️ UserIdentity password sync failed (non-fatal):", identityErr);
      }
    }

    return NextResponse.json(updatedUser);
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
