/**
 * GET /api/superadmin/diagnostics/integrity — Identity & Loyalty Health.
 * Auth: proxy guarduje ceo /api/superadmin prefiks (samo superadmin).
 *
 * Bez parametra → lagana lista salona { tenants } za "Izaberi salon" select.
 * ?tenantId=<ObjectId> → pokreće svih 9 read-only provera integriteta
 *   (src/lib/diagnostics/integrity) i vraća { report } — on-demand, bez crona,
 *   ništa se ne piše u bazu. Repair akcije su samo TEKST preporuke.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { runIntegrityChecks } from "@/lib/diagnostics/integrity";
import { integrityQuerySchema } from "@/types/diagnostics";
import type { IntegrityTenantOption } from "@/types/diagnostics";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    const rawTenantId = req.nextUrl.searchParams.get("tenantId");

    // Lista salona za select
    if (rawTenantId === null) {
      const docs = await Tenant.find({})
        .select("name slug")
        .sort({ name: 1 })
        .lean();
      const tenants: IntegrityTenantOption[] = (
        docs as Record<string, unknown>[]
      ).map((t) => ({
        tenantId: String(t._id),
        name: String(t.name ?? ""),
        slug: String(t.slug ?? ""),
      }));
      return NextResponse.json({ tenants });
    }

    const parsed = integrityQuerySchema.safeParse({ tenantId: rawTenantId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Nevažeći tenantId." },
        { status: 400 },
      );
    }
    const { tenantId } = parsed.data;

    const tenant = await Tenant.findById(tenantId).select("_id").lean();
    if (!tenant) {
      return NextResponse.json(
        { error: "Salon nije pronađen." },
        { status: 404 },
      );
    }

    const report = await runIntegrityChecks(tenantId);
    return NextResponse.json({ report });
  } catch (err) {
    console.error("[integrity] provere nisu pokrenute:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
