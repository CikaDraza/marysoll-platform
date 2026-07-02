/**
 * Growth Studio — admin povlačenje vaučera (samo active/reserved).
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { Voucher } from "@/models/Voucher";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.success) return auth.response;
  const denied = await requireFeature(auth.decoded.tenantId, "loyaltyCore");
  if (denied) return denied;

  const { id } = await context.params;
  await connectToDB();

  const voucher = await Voucher.findOneAndUpdate(
    {
      _id: id,
      tenantId: auth.decoded.tenantId,
      status: { $in: ["active", "reserved"] },
    },
    { $set: { status: "revoked", reservedAppointmentId: null } },
    { new: true },
  ).lean();

  if (!voucher) {
    return NextResponse.json(
      { error: "Vaučer nije pronađen ili se ne može povući" },
      { status: 404 },
    );
  }
  return NextResponse.json({ voucher });
}
