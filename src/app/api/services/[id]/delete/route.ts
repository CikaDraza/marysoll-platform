import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Service } from "@/models/Service";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";
import { revalidateMarketplaceCaches } from "@/lib/marketplace/revalidateMarketplace";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDB();
    const auth = (await requireAdmin(req)) as
      | { decoded: DecodedToken }
      | NextResponse;
    if (auth instanceof NextResponse) return auth;
    const tenantId = auth.decoded.tenantId;
    const { id } = await params;

    const filter: Record<string, unknown> = { _id: id };
    if (tenantId) filter.tenantId = tenantId;

    const deleted = await Service.findOneAndDelete(filter);
    if (!deleted)
      return NextResponse.json(
        { error: "Usluga nije pronađena." },
        { status: 404 },
      );
    // Removed service affects booking search + AI knowledge.
    await revalidateMarketplaceCaches();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/services/[id]/delete:", err);
    return NextResponse.json(
      { error: "Greška pri brisanju." },
      { status: 500 },
    );
  }
}
