// GET /api/salons
// Returns all salon profiles belonging to the authenticated admin's tenant.
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";

export async function GET(req: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant nije identifikovan" },
        { status: 403 },
      );
    }

    await connectToDB();

    const salons = await SalonProfile.find({ tenantId })
      .select("_id name city")
      .lean();

    return NextResponse.json({ salons });
  } catch (error: unknown) {
    console.error("[GET /api/salons] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch salons",
        stack:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      },
      { status: 500 },
    );
  }
}
