/**
 * Growth Studio — admin lista loyalty naloga klijenata (sa imenima).
 * GET ?q=<pretraga po imenu/emailu>&limit=<n>
 */
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/auth/auth-server";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { TenantUser } from "@/models/TenantUser";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.success) return auth.response;
  const denied = await requireCapability(auth.decoded.tenantId, "loyalty.rewards");
  if (denied) return denied;

  await connectToDB();
  const tenantId = new Types.ObjectId(auth.decoded.tenantId!);
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10) || 50,
    200,
  );

  const filter: Record<string, unknown> = { tenantId };
  if (q) {
    const users = (await TenantUser.find({
      tenantId,
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    })
      .select("_id")
      .limit(200)
      .lean()) as { _id: Types.ObjectId }[];
    filter.tenantUserId = { $in: users.map((u) => u._id) };
  }

  const accounts = (await LoyaltyAccount.find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean()) as unknown as Array<{
    _id: Types.ObjectId;
    tenantUserId: Types.ObjectId;
    [key: string]: unknown;
  }>;

  const userIds = accounts.map((a) => a.tenantUserId);
  const users = (await TenantUser.find({ _id: { $in: userIds } })
    .select("name email role")
    .lean()) as Array<{
    _id: Types.ObjectId;
    name?: string;
    email?: string;
    role?: string;
  }>;
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      ...a,
      client: userMap.get(a.tenantUserId.toString()) ?? null,
    })),
  });
}
