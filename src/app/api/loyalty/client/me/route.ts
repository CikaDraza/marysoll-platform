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

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const decoded = token ? verifyToken(token) : null;
  if (!decoded?.tenantUserId || !decoded.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    account: account ?? {
      heartsBalance: 0,
      pointsBalance: 0,
      lifetimeHearts: 0,
      lifetimePoints: 0,
      completedVisits: 0,
      currentStreak: 0,
    },
    config: config
      ? {
          currencies: config.currencies,
          milestone,
          pointsShop: config.pointsShop ?? [],
          celebration: config.celebration,
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
