import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Service } from "@/models/Service";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";

export async function PUT(
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
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/services/[id]/update:", err);
    return NextResponse.json(
      { error: "Greška pri ažuriranju." },
      { status: 500 },
    );
  }
}
