/**
 * PATCH /api/superadmin/tenants/[tenantId]/status
 *
 * SuperAdmin: change tenant status.
 * Body: { status: "active" | "suspended" | "pending" | "cancelled" }
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { notifyOwnerOfSalonActivation } from "@/lib/tenantLifecycle/notify";

type TenantStatus = "active" | "suspended" | "pending" | "cancelled";

type Params = { params: Promise<{ tenantId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;

  try {
    await connectToDB();

    const { status, reason } = (await req.json()) as {
      status: TenantStatus;
      reason?: string;
    };

    const validStatuses: TenantStatus[] = [
      "active",
      "suspended",
      "pending",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Neispravan status: ${status}` },
        { status: 400 },
      );
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant nije pronađen" },
        { status: 404 },
      );
    }

    const previousStatus = tenant.status;
    tenant.status = status;

    // Auto-logic when suspending or cancelling
    if (status === "suspended" || status === "cancelled") {
      tenant.isTrialActive = false;
    }
    if (status === "active") {
      tenant.verified = true;
    }

    await tenant.save();

    // Aktivacija javnog sajta je događaj koji vlasnica čeka — javi joj. Šalje se
    // samo na stvarnom PRELAZU, da ponovni klik na „Aktiviraj" ne pošalje
    // obaveštenje drugi put. `await` je nameran (serverless prekida
    // fire-and-forget); funkcija nikad ne baca.
    if (status === "active" && previousStatus !== "active") {
      await notifyOwnerOfSalonActivation({ tenantId });
    }

    return NextResponse.json({
      success: true,
      message: `Status salona promenjen na: ${status}.`,
      status: tenant.status,
      reason: reason || null,
    });
  } catch (err) {
    console.error("PATCH /api/superadmin/tenants/[tenantId]/status:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
