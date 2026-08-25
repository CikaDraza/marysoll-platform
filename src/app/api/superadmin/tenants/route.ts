/**
 * GET /api/superadmin/tenants
 * Returns all tenants with owner info, trial status, plan, payment info.
 * SuperAdmin only.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { AuthUser } from "@/models/AuthUser";
import { TenantUser } from "@/models/TenantUser";
import { Subscription } from "@/models/Subscription";
import { SalonProfile } from "@/models/SalonProfile";
import { Service } from "@/models/Service";
import { requireSuperAdmin } from "@/lib/auth/auth-server";

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();

    const tenants = await Tenant.find({}).sort({ createdAt: -1 }).lean();

    const now = new Date();

    // Broj usluga po tenantu jednim upitom — signal spremnosti na kartici.
    // Namerno van `map`-a da ne dodaje N+1 uz već postojeća dva upita po redu.
    const serviceCounts = new Map<string, number>(
      (
        await Service.aggregate<{ _id: unknown; n: number }>([
          { $group: { _id: "$tenantId", n: { $sum: 1 } } },
        ])
      ).map((row) => [String(row._id), row.n]),
    );

    const enriched = await Promise.all(
      tenants.map(async (t) => {
        const tenant = t as Record<string, unknown>;
        // ownerId now refs AuthUser (since Tenant.ownerId: ref AuthUser)
        const authOwner = (await AuthUser.findById(tenant.ownerId)
          .select("email isEmailVerified createdAt")
          .lean()) as Record<string, unknown> | null;

        // Get owner name from TenantUser
        const ownerProfile = authOwner
          ? ((await TenantUser.findOne({
              authUserId: tenant.ownerId,
              tenantId: tenant._id,
            })
              .select("name")
              .lean()) as { name?: string } | null)
          : null;

        const owner = authOwner
          ? {
              _id: String(authOwner._id),
              name: ownerProfile?.name ?? "",
              email: String(authOwner.email ?? ""),
              isEmailVerified: Boolean(authOwner.isEmailVerified),
              createdAt: (authOwner.createdAt as Date).toISOString(),
            }
          : null;

        const sub = (await Subscription.findOne({ tenantId: tenant._id })
          .select("overrideNote")
          .lean()) as { overrideNote?: string | null } | null;

        const salonProfile = (await SalonProfile.findOne({
          tenantId: tenant._id,
        })
          .select("isDemo logo landingTheme workingHours")
          .lean()) as {
          isDemo?: boolean;
          logo?: string | null;
          landingTheme?: string | null;
          workingHours?: Record<string, unknown> | null;
        } | null;

        // „Spremnost" je ono što superadmin ionako proverava pre objave sajta:
        // ima li salon logo, izabranu temu, radno vreme i bar jednu uslugu.
        const workingHours = salonProfile?.workingHours ?? null;
        const hasWorkingHours = Boolean(
          workingHours &&
            Object.values(workingHours).some(
              (v) => Array.isArray(v) && v.length > 0,
            ),
        );

        const trialEndsAt = tenant.trialEndsAt as Date | null;
        const trialDaysLeft = trialEndsAt
          ? Math.max(
              0,
              Math.ceil(
                (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
              ),
            )
          : null;

        return {
          _id: String(tenant._id),
          name: String(tenant.name ?? ""),
          slug: String(tenant.slug ?? ""),
          subdomain: String(tenant.subdomain ?? ""),
          cloudinaryFolder: String(tenant.cloudinaryFolder ?? ""),
          customDomain: tenant.customDomain
            ? String(tenant.customDomain)
            : null,
          status: String(tenant.status ?? "pending"),
          plan: String(tenant.plan ?? "maria"),
          paid: Boolean(tenant.paid),
          verified: Boolean(tenant.verified),
          isTrialActive: Boolean(tenant.isTrialActive),
          trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
          trialDaysLeft,
          planExpiresAt: tenant.planExpiresAt
            ? (tenant.planExpiresAt as Date).toISOString()
            : null,
          createdAt: (tenant.createdAt as Date).toISOString(),
          logo: salonProfile?.logo ? String(salonProfile.logo) : null,
          landingTheme: salonProfile?.landingTheme
            ? String(salonProfile.landingTheme)
            : null,
          hasWorkingHours,
          servicesCount: serviceCounts.get(String(tenant._id)) ?? 0,
          lemonsqueezyCustomerId: tenant.lemonsqueezyCustomerId
            ? String(tenant.lemonsqueezyCustomerId)
            : null,
          lemonsqueezySubscriptionId: tenant.lemonsqueezySubscriptionId
            ? String(tenant.lemonsqueezySubscriptionId)
            : null,
          owner,
          overrideNote: sub?.overrideNote ?? null,
          isDemo: Boolean(salonProfile?.isDemo),
        };
      }),
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (err) {
    console.error("GET /api/superadmin/tenants:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
