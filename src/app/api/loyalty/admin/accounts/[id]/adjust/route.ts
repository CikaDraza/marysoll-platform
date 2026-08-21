/**
 * Growth Studio — ručna korekcija balansa (obavezan razlog → adjust unos).
 * POST { currency: "hearts"|"points", amount: number, reason: string }
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/auth/auth-server";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { LoyaltyEvent } from "@/models/LoyaltyEvent";
import { postLedgerEntry } from "@/lib/loyalty/ledger";
import { getLoyaltyConfig } from "@/lib/loyalty/config";
import { createLoyaltyNotification } from "@/lib/loyalty/notifications";
import { formatCurrencyAmount } from "@/lib/loyalty/types";

const adjustSchema = z.object({
  currency: z.enum(["hearts", "points"]),
  amount: z.number().int().min(-100000).max(100000).refine((v) => v !== 0, {
    message: "Iznos ne može biti 0",
  }),
  reason: z.string().trim().min(3, "Razlog je obavezan").max(300),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.success) return auth.response;
  const denied = await requireCapability(auth.decoded.tenantId, "loyalty.rewards");
  if (denied) return denied;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nevalidan JSON" }, { status: 400 });
  }
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Nevalidan zahtev" },
      { status: 400 },
    );
  }

  await connectToDB();
  const account = (await LoyaltyAccount.findOne({
    _id: id,
    tenantId: auth.decoded.tenantId,
  }).lean()) as {
    _id: string;
    tenantUserId: string;
  } | null;
  if (!account) {
    return NextResponse.json({ error: "Nalog nije pronađen" }, { status: 404 });
  }

  // Audit event (odmah processed — knjiži se direktno ispod)
  const event = await LoyaltyEvent.create({
    tenantId: auth.decoded.tenantId,
    type: "manual_adjustment",
    sourceType: "admin",
    sourceId: `adjust:${crypto.randomUUID()}`,
    subjectTenantUserId: account.tenantUserId,
    payload: { ...parsed.data, adminUserId: auth.decoded.tenantUserId },
    status: "processed",
    processedAt: new Date(),
  });

  const result = await postLedgerEntry({
    tenantId: auth.decoded.tenantId!,
    accountId: account._id,
    tenantUserId: account.tenantUserId,
    entryType: "adjust",
    currency: parsed.data.currency,
    amount: parsed.data.amount,
    source: {
      eventId: event._id,
      adminUserId: auth.decoded.tenantUserId ?? undefined,
      reason: parsed.data.reason,
    },
    idempotencyKey: `evt:${event._id}:adjust`,
    description: parsed.data.reason,
  });

  if (result.applied !== 0) {
    const config = await getLoyaltyConfig(auth.decoded.tenantId!);
    const names =
      parsed.data.currency === "hearts"
        ? config?.currencies.hearts
        : config?.currencies.points;
    await createLoyaltyNotification({
      tenantId: auth.decoded.tenantId!,
      recipientProfileId: account.tenantUserId,
      type: "loyalty_adjustment",
      title: "Korekcija naloga",
      message: names
        ? `${result.applied > 0 ? "+" : ""}${formatCurrencyAmount(result.applied, names)} ${names.emoji} — ${parsed.data.reason}`
        : `Korekcija: ${result.applied > 0 ? "+" : ""}${result.applied} — ${parsed.data.reason}`,
      celebration: result.applied > 0,
      metadata:
        parsed.data.currency === "hearts"
          ? { hearts: result.applied }
          : { points: result.applied },
    });
  }

  return NextResponse.json({ applied: result.applied });
}
