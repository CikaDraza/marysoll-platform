/**
 * GET /api/cron/usage-snapshot
 *
 * Dnevni snimak potrošnje (Vercel Cron, 21:10 UTC = 23:10 leti / 22:10 zimi po Beogradu).
 * Osvežava latest cache (`PlatformUsageSnapshot`) i dodaje append-only
 * istoriju, pa mesečni rast po salonu postoji i bez ručnog "Osveži potrošnju".
 * Ne dira ResourceQuotaCalibration — kalibracija ostaje eksplicitna akcija.
 *
 * Poziva Cloudinary Admin API (≈ 1 + broj salona zahteva), zato traži
 * Authorization: Bearer CRON_SECRET; bez podešenog secret-a radi samo lokalno.
 */
import { NextRequest, NextResponse } from "next/server";
import { refreshPlatformUsage } from "@/lib/superadmin/platformUsage";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? req.headers.get("authorization") === `Bearer ${secret}`
    : process.env.NODE_ENV === "development";
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const usage = await refreshPlatformUsage("cron");
    const capture = usage.capture;
    if (!capture || capture.status !== "complete") {
      return NextResponse.json(
        { ok: false, capture, error: "Incomplete usage history capture" },
        { status: 503 },
      );
    }
    return NextResponse.json({
      ok: true,
      capture,
      tenants: capture.tenantHistoryCount,
      syncedAt: usage.tenantUsage?.syncedAt ?? null,
    });
  } catch (err) {
    console.error("[cron/usage-snapshot] failed:", err);
    return NextResponse.json(
      { error: "Usage snapshot failed" },
      { status: 500 },
    );
  }
}
