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

function serializeService(s: Record<string, unknown>) {
  return {
    _id: String(s._id ?? ""),
    name: String(s.name ?? ""),
    category: String(s.category ?? ""),
    subcategory: s.subcategory ? String(s.subcategory) : undefined,
    type: String(s.type ?? "single"),
    basePrice: s.basePrice != null ? Number(s.basePrice) : null,
    priceMode: s.priceMode === "on_request" ? "on_request" : "fixed",
    duration: s.duration != null ? Number(s.duration) : null,
    description: String(s.description ?? ""),
    items: Array.isArray(s.items) ? s.items.map(String) : [],
    featured: s.featured ? String(s.featured) : null,
    // Serialize nested arrays — strip _id from subdocs
    variants: Array.isArray(s.variants)
      ? s.variants.map((v: unknown) => {
          const vv = v as Record<string, unknown>;
          return {
            name: String(vv.name ?? ""),
            price: Number(vv.price ?? 0),
            priceMode: vv.priceMode === "on_request" ? "on_request" : "fixed",
            duration: Number(vv.duration ?? 0),
            perItem: Boolean(vv.perItem),
            description: vv.description ? String(vv.description) : undefined,
          };
        })
      : [],
    extras: Array.isArray(s.extras)
      ? s.extras.map((e: unknown) => {
          const ee = e as Record<string, unknown>;
          return {
            name: String(ee.name ?? ""),
            price: Number(ee.price ?? 0),
            priceMode: ee.priceMode === "on_request" ? "on_request" : "fixed",
            duration: Number(ee.duration ?? 0),
            perItem: Boolean(ee.perItem),
          };
        })
      : [],
    services: Array.isArray(s.services)
      ? s.services.map((sv: unknown) => {
          const ss = sv as Record<string, unknown>;
          return {
            name: String(ss.name ?? ""),
            price: Number(ss.price ?? 0),
            priceMode: ss.priceMode === "on_request" ? "on_request" : "fixed",
            duration: Number(ss.duration ?? 0),
            description: String(ss.description ?? ""),
          };
        })
      : [],
    subscription: {
      enabled: Boolean((s.subscription as Record<string, unknown>)?.enabled ?? false),
      priceMonthly: (s.subscription as Record<string, unknown>)?.priceMonthly != null
        ? Number((s.subscription as Record<string, unknown>).priceMonthly)
        : null,
      startDate: (s.subscription as Record<string, unknown>)?.startDate
        ? String((s.subscription as Record<string, unknown>).startDate)
        : null,
      endDate: (s.subscription as Record<string, unknown>)?.endDate
        ? String((s.subscription as Record<string, unknown>).endDate)
        : null,
    },
  };
}

type Params = { params: Promise<{ tenantSlug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { tenantSlug } = await params;
  try {
    await connectToDB();
    const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();
    if (!tenant) {
      return NextResponse.json({ success: false, error: "Salon nije pronađen" }, { status: 404 });
    }
    const services = await Service.find({
      tenantId: (tenant as Record<string, unknown>)._id,
    })
      .sort({ category: 1, name: 1 })
      .lean();

    return NextResponse.json(
      services.map((s) => serializeService(s as Record<string, unknown>))
    );
  } catch (err) {
    console.error("GET /api/public/[tenantSlug]/services:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
