import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Service } from "@/models/Service";
import { requireAdmin } from "@/lib/auth/auth-server";
import { requireCapability } from "@/lib/platform/capabilities-server";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Params) {
  try {
    await connectToDB();
    const auth = requireAdmin(req);
    if (!auth.success) return auth.response;
    const denied = await requireCapability(auth.decoded.tenantId, "services.catalog");
    if (denied) return denied;

    const { id } = await params;
    const deleted = await Service.findOneAndDelete({
      _id: id,
      tenantId: auth.decoded.tenantId,
    });
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Service deleted" });
  } catch {
    return NextResponse.json(
      { error: "Error deleting service" },
      { status: 500 },
    );
  }
}
