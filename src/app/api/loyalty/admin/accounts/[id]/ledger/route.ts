/**
 * Growth Studio — admin uvid u ledger jednog naloga (istorija verbatim).
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.success) return auth.response;
  const denied = await requireFeature(auth.decoded.tenantId, "loyaltyCore");
  if (denied) return denied;

  const { id } = await context.params;
  await connectToDB();

  // Tenant scoping: nalog mora pripadati adminovom salonu.
  const account = await LoyaltyAccount.findOne({
    _id: id,
    tenantId: auth.decoded.tenantId,
  }).lean();
  if (!account) {
    return NextResponse.json({ error: "Nalog nije pronađen" }, { status: 404 });
  }

  const entries = await LoyaltyLedger.find({
    tenantId: auth.decoded.tenantId,
    accountId: id,
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json({ account, entries });
}
