import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { verifyToken } from "@/lib/auth/auth-server";

export async function DELETE(
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

    if (!decoded.isAdmin && !decoded.isSuperAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // id = TenantUser._id
    const targetUser = await TenantUser.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only superadmin can delete OWNER/ADMIN accounts
    if (["OWNER", "ADMIN"].includes(targetUser.role) && !decoded.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only superadmin can delete admin users" },
        { status: 403 },
      );
    }

    // Prevent self-deletion
    if (decoded.tenantUserId === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 403 },
      );
    }

    const deletedUser = await TenantUser.findByIdAndDelete(id);
    if (!deletedUser) {
      return NextResponse.json({ error: "User not found during deletion" }, { status: 404 });
    }

    // Note: AuthUser is NOT deleted here for clients (they have no AuthUser).
    // For OWNER/ADMIN/STAFF who have authUserId, the AuthUser is managed separately
    // via the platform (superadmin tools). Deleting a TenantUser does not cascade
    // to AuthUser — the platform identity remains independent.

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
      { status: 500 },
    );
  }
}
