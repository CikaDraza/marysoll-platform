import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { Voucher } from "@/models/Voucher";
import { LoyaltyConfig } from "@/models/LoyaltyConfig";
import { requireCapability } from "@/lib/platform/capabilities-server";

/** Javni, read-only preview gift koda; ne otkriva identitet referrera. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const code = req.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code) return NextResponse.json({ valid: false });

  await connectToDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug, status: "active" })
    .select("_id")
    .lean<{ _id: unknown }>();
  if (!tenant) return NextResponse.json({ valid: false });
  const denied = await requireCapability(String(tenant._id), "loyalty.rewards");
  if (denied) return NextResponse.json({ valid: false });

  const [config, voucher] = await Promise.all([
    LoyaltyConfig.findOne({ tenantId: tenant._id })
      .select("enabled sharing.enabled")
      .lean<{ enabled?: boolean; sharing?: { enabled?: boolean } }>(),
    Voucher.findOne({
      tenantId: tenant._id,
      code,
      origin: "gift",
      status: "active",
      ownerTenantUserId: null,
      giftedByTenantUserId: { $ne: null },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    })
      .select("code type value serviceName expiresAt")
      .lean<{
        code: string;
        type: string;
        value: number;
        serviceName?: string;
        expiresAt?: Date;
      }>(),
  ]);

  if (!config?.enabled || !config.sharing?.enabled || !voucher) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    voucher: {
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      serviceName: voucher.serviceName ?? "",
      expiresAt: voucher.expiresAt ?? null,
    },
  });
}
