/**
 * PATCH /api/superadmin/tenants/[tenantId]/trial
 *
 * SuperAdmin: manage trial period for a specific tenant.
 *
 * Body options:
 *   { action: "activate", days: 30 }          — start/restart trial for N days
 *   { action: "extend", days: 14 }             — extend existing trial by N days
 *   { action: "deactivate" }                   — end trial immediately
 *   { action: "set_trial_type", requiresCard: true|false } — toggle payment-first vs free trial
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { requireSuperAdmin } from "@/lib/auth/auth-server";

type TrialAction = "activate" | "extend" | "deactivate";

type Params = { params: Promise<{ tenantId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;

  try {
    await connectToDB();

    const body = await req.json();
    const { action, days } = body as { action: TrialAction; days?: number };

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant nije pronađen" }, { status: 404 });
    }

    const now = new Date();

    switch (action) {
      case "activate": {
        const trialDays = Math.max(1, Math.min(days ?? 30, 365));
        const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
        tenant.isTrialActive = true;
        tenant.trialEndsAt = trialEndsAt;
        tenant.status = "active";
        tenant.verified = true;
        break;
      }

      case "extend": {
        const extendDays = Math.max(1, Math.min(days ?? 7, 365));
        const baseDate = tenant.trialEndsAt && tenant.trialEndsAt > now
          ? tenant.trialEndsAt          // extend from current end
          : now;                         // extend from now if already expired
        const newEnd = new Date(baseDate.getTime() + extendDays * 24 * 60 * 60 * 1000);
        tenant.isTrialActive = true;
        tenant.trialEndsAt = newEnd;
        if (tenant.status !== "active") tenant.status = "active";
        break;
      }

      case "deactivate": {
        tenant.isTrialActive = false;
        tenant.trialEndsAt = now; // mark as expired now
        break;
      }

      default:
        return NextResponse.json(
          { error: `Nepoznata akcija: ${action}` },
          { status: 400 }
        );
    }

    await tenant.save();

    return NextResponse.json({
      success: true,
      message: `Trial ${action === "activate" ? "aktiviran" : action === "extend" ? "produžen" : "deaktiviran"}.`,
      trial: {
        isTrialActive: tenant.isTrialActive,
        trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
        status: tenant.status,
      },
    });
  } catch (err) {
    console.error("PATCH /api/superadmin/tenants/[tenantId]/trial:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
