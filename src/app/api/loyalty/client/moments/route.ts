/**
 * Growth Studio — celebration momenti.
 *
 * GET  → neviđene celebration notifikacije (max 3, poslednjih 7 dana)
 * POST → { ids: string[] } označi kao viđene
 *
 * Klijent nije na sajtu u trenutku completion-a — moment se pušta pri
 * sledećoj poseti panela/sajta (push notifikacija stiže odmah).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { Notification } from "@/models/Notification";
import { requireCapability } from "@/lib/platform/capabilities-server";

const CELEBRATION_TYPES = [
  "loyalty_hearts_earned",
  "loyalty_points_earned",
  "loyalty_voucher_received",
  "loyalty_tier_upgraded",
  "loyalty_adjustment",
];

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const decoded = token ? verifyToken(token) : null;
  if (!decoded?.tenantUserId || !decoded.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = await requireCapability(decoded.tenantId, "loyalty.rewards");
  if (denied) return denied;

  await connectToDB();
  const since = new Date(Date.now() - 7 * 24 * 3_600_000);
  const moments = await Notification.find({
    tenantId: decoded.tenantId,
    recipientProfileId: decoded.tenantUserId,
    type: { $in: CELEBRATION_TYPES },
    "metadata.celebration": true,
    "metadata.celebrationSeen": { $ne: true },
    createdAt: { $gte: since },
  })
    .select("type title message metadata createdAt")
    .sort({ createdAt: 1 })
    .limit(3)
    .lean();

  return NextResponse.json({ moments });
}

const seenSchema = z.object({ ids: z.array(z.string()).min(1).max(10) });

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const decoded = token ? verifyToken(token) : null;
  if (!decoded?.tenantUserId || !decoded.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = await requireCapability(decoded.tenantId, "loyalty.rewards");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nevalidan JSON" }, { status: 400 });
  }
  const parsed = seenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nevalidan zahtev" }, { status: 400 });
  }

  await connectToDB();
  const ids = parsed.data.ids
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  await Notification.updateMany(
    {
      _id: { $in: ids },
      // Scoping: klijent može da označi samo svoje notifikacije
      tenantId: decoded.tenantId,
      recipientProfileId: decoded.tenantUserId,
    },
    { $set: { "metadata.celebrationSeen": true } },
  );

  return NextResponse.json({ ok: true });
}
