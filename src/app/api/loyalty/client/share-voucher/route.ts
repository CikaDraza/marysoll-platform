import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { Voucher } from "@/models/Voucher";
import { isLoyaltyActive } from "@/lib/loyalty/events";
import { issueVoucher } from "@/lib/loyalty/vouchers/service";
import type { RewardSpec } from "@/lib/loyalty/types";
import { requireCapability } from "@/lib/platform/capabilities-server";

/**
 * POST /api/loyalty/client/share-voucher — klijent poklanja popust prijateljici
 * (Phase 2 share voucher). Izdaje gift vaučer (owner=null → preuzima ga onaj ko
 * ga iskoristi pri bookingu, postojeći tok). Aditivno; ne dira postojeće.
 * Cap: najviše config.sharing.maxActivePerClient aktivnih po klijentu (anti-abuse).
 */
const DEFAULT_FRIEND_REWARD: RewardSpec = {
  type: "percent",
  value: 15,
  serviceName: "",
  expiresDays: 30,
};

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const decoded = token ? verifyToken(token) : null;
  if (!decoded?.tenantUserId || !decoded.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = await requireCapability(decoded.tenantId, "loyalty.rewards");
  if (denied) return denied;

  await connectToDB();
  const { active, config } = await isLoyaltyActive(decoded.tenantId);
  if (!active || !config) {
    return NextResponse.json(
      { error: "Loyalty program nije aktivan." },
      { status: 400 },
    );
  }
  if (!config.sharing?.enabled) {
    return NextResponse.json(
      { error: "Deljenje vaučera nije uključeno." },
      { status: 400 },
    );
  }

  // Anti-abuse: ograniči broj aktivnih poklon-vaučera po klijentu.
  const maxActive = config.sharing.maxActivePerClient ?? 3;
  const activeCount = await Voucher.countDocuments({
    tenantId: decoded.tenantId,
    giftedByTenantUserId: decoded.tenantUserId,
    origin: "gift",
    status: { $in: ["active", "reserved"] },
  });
  if (activeCount >= maxActive) {
    return NextResponse.json(
      { error: `Dostigli ste limit od ${maxActive} aktivnih poklona.` },
      { status: 429 },
    );
  }

  const reward = config.sharing.friendReward ?? DEFAULT_FRIEND_REWARD;
  const voucher = await issueVoucher({
    tenantId: decoded.tenantId,
    ownerTenantUserId: null, // nepreuzet poklon — preuzima ga prijateljica
    giftedByTenantUserId: decoded.tenantUserId,
    origin: "gift",
    type: reward.type,
    value: reward.value,
    serviceName: reward.serviceName ?? "",
    expiresDays: reward.expiresDays,
  });

  return NextResponse.json({
    ok: true,
    code: voucher.code,
    type: voucher.type,
    value: voucher.value,
    serviceName: voucher.serviceName ?? "",
    expiresAt: voucher.expiresAt ?? null,
  });
}
