/**
 * Growth Studio — klijentov voucher wallet.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { Voucher } from "@/models/Voucher";
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
  const vouchers = await Voucher.find({
    tenantId: decoded.tenantId,
    ownerTenantUserId: decoded.tenantUserId,
    status: { $in: ["active", "reserved", "redeemed"] },
  })
    .select("code type value serviceName status expiresAt redeemedAt createdAt")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({ vouchers });
}
