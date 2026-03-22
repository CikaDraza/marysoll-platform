import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth/auth-server";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    // Pronađi trenutnog korisnika (admina)
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        { status: 404 }
      );
    }

    // Pronađi target korisnika
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        { status: 404 }
      );
    }

    // Superadmin provera - samo superadmin može brisati admine
    if (targetUser.isAdmin && !currentUser.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only superadmin can delete admin users" },
        { status: 403 }
      );
    }

    // Opciono: Sprečavanje brisanja vlastitog naloga
    if (currentUser._id.toString() === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 403 }
      );
    }

    // Izvrši brisanje
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json(
        {
          error: "User not found during deletion",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "User deleted successfully",
      deletedUserId: id,
      deletedUserName: deletedUser.name,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      {
        error: "Error deleting user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
