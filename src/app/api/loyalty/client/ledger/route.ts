/**
 * Growth Studio — klijentova istorija (ledger verbatim, izvor poverenja).
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const decoded = token ? verifyToken(token) : null;
  if (!decoded?.tenantUserId || !decoded.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDB();
  const entries = await LoyaltyLedger.find({
    tenantId: decoded.tenantId,
    tenantUserId: decoded.tenantUserId,
  })
    .select("entryType currency amount description createdAt")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json({ entries });
}
