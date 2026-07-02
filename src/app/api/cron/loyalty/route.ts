/**
 * GET /api/cron/loyalty
 *
 * Growth Studio sweeper (na ~15 min, kao /api/cron/reminders):
 *   1. Dvostepeni auto-complete (prompt adminu → auto completed)
 *   2. Retry neobrađenih loyalty događaja (safety net)
 *   3. Isticanje vaučera
 *
 * Pozivaju ga Vercel Cron ILI eksterni scheduler (Authorization: Bearer CRON_SECRET).
 */
import { NextRequest, NextResponse } from "next/server";
import { runLoyaltyCron } from "@/lib/loyalty/cron/runLoyaltyCron";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron");
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}` &&
    !isVercelCron
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runLoyaltyCron();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/loyalty] failed:", err);
    return NextResponse.json({ error: "Loyalty cron failed" }, { status: 500 });
  }
}
