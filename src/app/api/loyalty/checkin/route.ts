import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { isLoyaltyActive } from "@/lib/loyalty/events";
import { platformBus } from "@/lib/platform/event-bus";
import { registerPlatformSubscribers } from "@/lib/platform/subscribers";
import { requireCapability } from "@/lib/platform/capabilities-server";

/**
 * POST /api/loyalty/checkin — QR check-in ulogovanog klijenta (Phase 1).
 * Ruta na TENANT domenu (klijentov token je tu). Publikuje `client_checkin` na
 * platform Event Bus → Loyalty subscriber → durabilni event → streak + poeni.
 * Dedup (1×/dan) je na nivou loyalty eventa (sourceId). Vraća trenutni rezultat.
 */
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const decoded = token ? verifyToken(token) : null;
  if (!decoded?.tenantUserId || !decoded.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = await requireCapability(decoded.tenantId, "loyalty.rewards");
  if (denied) return denied;

  // Instrumentation registruje subscribere na boot-u; idempotentni safety net
  // za slučaj da hendler rute startuje pre instrumentation-a.
  registerPlatformSubscribers();

  await connectToDB();
  const { active } = await isLoyaltyActive(decoded.tenantId);
  if (!active) {
    return NextResponse.json(
      { error: "Loyalty program nije aktivan." },
      { status: 400 },
    );
  }

  // BUS — prvi realni emitter: publish čeka Loyalty subscriber (durabilni event),
  // pa je account ažuriran kad publish razreši (trenutni feedback klijentu).
  await platformBus.publish({
    type: "client_checkin",
    tenantId: String(decoded.tenantId),
    clientId: String(decoded.tenantUserId),
    occurredAt: new Date().toISOString(),
    source: "qr",
  });

  const account = await LoyaltyAccount.findOne({
    tenantId: decoded.tenantId,
    tenantUserId: decoded.tenantUserId,
  })
    .select("checkinStreak longestCheckinStreak pointsBalance heartsBalance")
    .lean<{
      checkinStreak?: number;
      longestCheckinStreak?: number;
      pointsBalance?: number;
      heartsBalance?: number;
    }>();

  return NextResponse.json({
    ok: true,
    checkinStreak: account?.checkinStreak ?? 0,
    longestCheckinStreak: account?.longestCheckinStreak ?? 0,
    pointsBalance: account?.pointsBalance ?? 0,
    heartsBalance: account?.heartsBalance ?? 0,
  });
}
