/**
 * Growth Studio — klijentov loyalty pregled (balans, napredak, sledeća nagrada).
 * Balans se prikazuje i ako je program pauziran (trust) — enabled flag
 * govori UI-ju da li program trenutno teče.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { getLoyaltyConfig } from "@/lib/loyalty/config";
import { isLoyaltyActive } from "@/lib/loyalty/events";
import { requireCapability } from "@/lib/platform/capabilities-server";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const decoded = token ? verifyToken(token) : null;
  if (!decoded?.tenantUserId || !decoded.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = await requireCapability(decoded.tenantId, "loyalty.rewards");
  if (denied) return denied;

  await connectToDB();
  const [{ active }, config, account] = await Promise.all([
    isLoyaltyActive(decoded.tenantId),
    getLoyaltyConfig(decoded.tenantId),
    LoyaltyAccount.findOne({
      tenantId: decoded.tenantId,
      tenantUserId: decoded.tenantUserId,
    }).lean(),
  ]);

  if (!config && !account) {
    return NextResponse.json({ enabled: false, account: null, config: null });
  }

  const milestone = config?.milestones?.[0] ?? null;

  return NextResponse.json({
    enabled: active,
    account: account
      ? {
          ...account,
          checkinStreak:
            (account as { checkinStreak?: number }).checkinStreak ?? 0,
          longestCheckinStreak:
            (account as { longestCheckinStreak?: number })
              .longestCheckinStreak ?? 0,
          lastCheckinAt:
            (account as { lastCheckinAt?: Date }).lastCheckinAt ?? null,
        }
      : {
          heartsBalance: 0,
          pointsBalance: 0,
          lifetimeHearts: 0,
          lifetimePoints: 0,
          completedVisits: 0,
          currentStreak: 0,
          checkinStreak: 0,
          longestCheckinStreak: 0,
          lastCheckinAt: null,
        },
    config: config
      ? {
          currencies: config.currencies,
          milestone,
          pointsShop: config.pointsShop ?? [],
          celebration: config.celebration,
          streak: { windowDays: config.streak?.windowDays ?? 45 },
          sharing: config.sharing?.enabled
            ? {
                enabled: true,
                friendReward: config.sharing.friendReward ?? null,
              }
            : null,
        }
      : null,
  });
}
