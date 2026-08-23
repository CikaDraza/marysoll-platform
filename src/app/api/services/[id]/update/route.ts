import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Service } from "@/models/Service";
import { requireAdmin } from "@/lib/auth/auth-server";
import { revalidateMarketplaceCaches } from "@/lib/marketplace/revalidateMarketplace";
import { requireCapability } from "@/lib/platform/capabilities-server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDB();
    const auth = requireAdmin(req);
    if (!auth.success) return auth.response;
    const denied = await requireCapability(auth.decoded.tenantId, "services.catalog");
    if (denied) return denied;
    const tenantId = auth.decoded.tenantId;
    const { id } = await params;
    const body = await req.json();

    const filter: Record<string, unknown> = { _id: id };
    if (tenantId) filter.tenantId = tenantId;

    const updated = await Service.findOneAndUpdate(
      filter,
      { $set: body },
      { new: true },
    );
    if (!updated)
      return NextResponse.json(
        { error: "Usluga nije pronađena." },
        { status: 404 },
      );
    // Price/category/duration edit affects booking search + AI knowledge.
    await revalidateMarketplaceCaches();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/services/[id]/update:", err);
    return NextResponse.json(
      { error: "Greška pri ažuriranju." },
      { status: 500 },
    );
  }
}
