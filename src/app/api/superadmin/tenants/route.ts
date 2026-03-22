/**
 * GET /api/superadmin/tenants
 * Returns all tenants with owner info, trial status, plan, payment info.
 * SuperAdmin only.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { User } from "@/models/User";
import { requireSuperAdmin } from "@/lib/auth/auth-server";

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();

    const tenants = await Tenant.find({})
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();

    const enriched = await Promise.all(
      tenants.map(async (t) => {
        const tenant = t as Record<string, unknown>;
        const owner = await User.findById(tenant.ownerId)
          .select("name email isEmailVerified createdAt")
          .lean() as Record<string, unknown> | null;

        const trialEndsAt = tenant.trialEndsAt as Date | null;
        const trialDaysLeft = trialEndsAt
          ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : null;

        return {
          _id: String(tenant._id),
          name: String(tenant.name ?? ""),
          slug: String(tenant.slug ?? ""),
          customDomain: tenant.customDomain ? String(tenant.customDomain) : null,
          status: String(tenant.status ?? "pending"),
          plan: String(tenant.plan ?? "free"),
          paid: Boolean(tenant.paid),
          verified: Boolean(tenant.verified),
          isTrialActive: Boolean(tenant.isTrialActive),
          trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
          trialDaysLeft,
          planExpiresAt: tenant.planExpiresAt ? (tenant.planExpiresAt as Date).toISOString() : null,
          createdAt: (tenant.createdAt as Date).toISOString(),
          lemonsqueezyCustomerId: tenant.lemonsqueezyCustomerId
            ? String(tenant.lemonsqueezyCustomerId)
            : null,
          lemonsqueezySubscriptionId: tenant.lemonsqueezySubscriptionId
            ? String(tenant.lemonsqueezySubscriptionId)
            : null,
          owner: owner
            ? {
                _id: String(owner._id),
                name: String(owner.name ?? ""),
                email: String(owner.email ?? ""),
                isEmailVerified: Boolean(owner.isEmailVerified),
                createdAt: (owner.createdAt as Date).toISOString(),
              }
            : null,
        };
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (err) {
    console.error("GET /api/superadmin/tenants:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
