/**
 * DELETE /api/superadmin/tenants/[tenantId]
 * Permanently deletes a tenant and all related data from the database.
 * SuperAdmin only.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { Subscription } from "@/models/Subscription";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import {
  deleteTenantPermanently,
  TenantDeletionError,
} from "@/lib/tenant/deleteTenant";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;

  try {
    await connectToDB();

    const tenant = await Tenant.findById(tenantId).lean<{
      paid?: boolean;
      plan?: string;
    } | null>();
    if (!tenant) {
      return NextResponse.json({ error: "Salon nije pronađen" }, { status: 404 });
    }

    // ── Salon u pretplati se NE briše iz superadmina ──────────────────────────
    // Brisanje je nepovratno i uklanja podatke koje vlasnica plaća. Odluku o
    // prekidu ima vlasnica: ona otkazuje pretplatu i briše salon iz svog panela.
    // Superadmin u međuvremenu može da SAKRIJE sajt (status → `suspended`), što
    // je povratno.
    //
    // `past_due` se takođe štiti: to je neuspela naplata, ne otkaz — pretplata
    // je i dalje živa i vlasnica je i dalje klijent.
    const liveSub = await Subscription.findOne({
      tenantId,
      status: { $in: ["active", "past_due"] },
    })
      .select("status plan")
      .lean<{ status?: string; plan?: string } | null>();

    if (tenant.paid === true || liveSub) {
      return NextResponse.json(
        {
          error:
            "Salon je u pretplati i ne može biti obrisan iz superadmina. " +
            "Sakrijte sajt (Suspenduj) ili zamolite vlasnicu da otkaže " +
            "pretplatu i obriše salon iz svog panela.",
          code: "TENANT_HAS_ACTIVE_SUBSCRIPTION",
          subscriptionStatus: liveSub?.status ?? (tenant.paid ? "paid" : null),
          plan: liveSub?.plan ?? tenant.plan ?? null,
        },
        { status: 409 },
      );
    }

    // Cascade, ownership invariant i zaustavljanje naplate su ZAJEDNIČKI sa
    // owner rutom — `lib/tenant/deleteTenant.ts`. Dve ručne liste su se već
    // bile razišle: ova je brisala i `Category`, koja NIJE tenant podatak.
    const result = await deleteTenantPermanently({ tenantId });

    return NextResponse.json({
      success: true,
      message: "Salon je trajno obrisan",
      ...result,
    });
  } catch (err) {
    if (err instanceof TenantDeletionError) {
      const status = err.code === "TENANT_NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("DELETE /api/superadmin/tenants/[tenantId]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
