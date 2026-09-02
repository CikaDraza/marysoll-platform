/**
 * GET /api/public/[tenantSlug]/services
 *
 * Public — no auth required.
 * Returns all services for a tenant, serialized (no ObjectIds).
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { Service } from "@/models/Service";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { toBookingServicePresentation } from "@/lib/booking/servicePresentation";

type Params = { params: Promise<{ tenantSlug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { tenantSlug } = await params;
  try {
    await connectToDB();
    const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();
    if (!tenant) {
      return NextResponse.json({ success: false, error: "Salon nije pronađen" }, { status: 404 });
    }
    const denied = await requireCapability(
      String((tenant as Record<string, unknown>)._id),
      "services.catalog",
    );
    if (denied) return NextResponse.json([]);
    const services = await Service.find({
      tenantId: (tenant as Record<string, unknown>)._id,
    })
      .sort({ category: 1, name: 1 })
      .lean();

    return NextResponse.json(
      services.map((s) =>
        toBookingServicePresentation(s as Record<string, unknown>),
      ),
    );
  } catch (err) {
    console.error("GET /api/public/[tenantSlug]/services:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
