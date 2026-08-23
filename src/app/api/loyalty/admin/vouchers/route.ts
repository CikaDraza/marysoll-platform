/**
 * Growth Studio — admin vaučeri.
 * GET  ?status=<filter> → lista (sa imenom vlasnika)
 * POST → ručno izdavanje ("Pokloni vaučer")
 */
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/auth/auth-server";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { Voucher } from "@/models/Voucher";
import { TenantUser } from "@/models/TenantUser";
import { issueVoucher } from "@/lib/loyalty/vouchers/service";
import { createLoyaltyNotification } from "@/lib/loyalty/notifications";
import { describeReward } from "@/lib/loyalty/engine";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.success) return auth.response;
  const denied = await requireCapability(auth.decoded.tenantId, "loyalty.rewards");
  if (denied) return denied;

  await connectToDB();
  const status = req.nextUrl.searchParams.get("status");
  const filter: Record<string, unknown> = { tenantId: auth.decoded.tenantId };
  if (status) filter.status = status;

  const vouchers = (await Voucher.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean()) as unknown as Array<{
    ownerTenantUserId: Types.ObjectId | null;
    [key: string]: unknown;
  }>;

  const ownerIds = vouchers
    .map((v) => v.ownerTenantUserId)
    .filter((id): id is Types.ObjectId => Boolean(id));
  const owners = (await TenantUser.find({ _id: { $in: ownerIds } })
    .select("name email")
    .lean()) as Array<{ _id: Types.ObjectId; name?: string; email?: string }>;
  const ownerMap = new Map(owners.map((o) => [o._id.toString(), o]));

  return NextResponse.json({
    vouchers: vouchers.map((v) => ({
      ...v,
      owner: v.ownerTenantUserId
        ? (ownerMap.get(v.ownerTenantUserId.toString()) ?? null)
        : null,
    })),
  });
}

const issueSchema = z.object({
  tenantUserId: z.string().min(1),
  type: z.enum(["percent", "fixed", "free_service"]),
  value: z.number().min(0).max(1000000),
  serviceName: z.string().max(120).optional().default(""),
  expiresDays: z.number().min(1).max(365).default(90),
});

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.success) return auth.response;
  const denied = await requireCapability(auth.decoded.tenantId, "loyalty.rewards");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nevalidan JSON" }, { status: 400 });
  }
  const parsed = issueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Nevalidan zahtev" },
      { status: 400 },
    );
  }
  if (parsed.data.type === "percent" && parsed.data.value > 100) {
    return NextResponse.json(
      { error: "Procenat ne može biti veći od 100" },
      { status: 400 },
    );
  }

  await connectToDB();
  const client = await TenantUser.findOne({
    _id: parsed.data.tenantUserId,
    tenantId: auth.decoded.tenantId,
  })
    .select("_id name")
    .lean();
  if (!client) {
    return NextResponse.json(
      { error: "Klijent nije pronađen" },
      { status: 404 },
    );
  }

  const voucher = await issueVoucher({
    tenantId: auth.decoded.tenantId!,
    ownerTenantUserId: parsed.data.tenantUserId,
    type: parsed.data.type,
    value: parsed.data.value,
    serviceName: parsed.data.serviceName,
    origin: "manual",
    expiresDays: parsed.data.expiresDays,
    issuedByAdminId: auth.decoded.tenantUserId ?? undefined,
  });

  await createLoyaltyNotification({
    tenantId: auth.decoded.tenantId!,
    recipientProfileId: parsed.data.tenantUserId,
    type: "loyalty_voucher_received",
    title: "Poklon od salona! 🎁",
    message: `Dobili ste vaučer: ${describeReward({
      type: parsed.data.type,
      value: parsed.data.value,
      serviceName: parsed.data.serviceName,
      expiresDays: parsed.data.expiresDays,
    })} — kod ${voucher.code}`,
    celebration: true,
    metadata: {
      voucherCode: voucher.code,
      voucherType: voucher.type,
      voucherValue: voucher.value,
      voucherExpiresAt: voucher.expiresAt
        ? new Date(voucher.expiresAt).toISOString().slice(0, 10)
        : undefined,
    },
  });

  return NextResponse.json({ voucher }, { status: 201 });
}
