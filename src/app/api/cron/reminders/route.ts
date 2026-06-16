/**
 * GET /api/cron/reminders
 *
 * Šalje podsetnike za termine 1 sat i 30 minuta pre početka (push + in-app),
 * klijentu i adminima salona. Idempotentno (dedupe preko Appointment.reminderSent).
 *
 * Treba ga pozivati često (na ~10–15 min) da bi prozori 1h/30min bili pogođeni.
 * Pozivaju ga Vercel Cron ILI eksterni scheduler (Authorization: Bearer CRON_SECRET).
 *
 * NAPOMENA: Vercel Hobby plan pokreće cron samo jednom dnevno. Za realne
 * podsetnike potrebno je Vercel Pro (češći cron) ili eksterni cron servis
 * (cron-job.org / GitHub Actions / Upstash) koji gađa ovaj endpoint.
 */
import { NextRequest, NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/reminders/sendDueReminders";

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
    const result = await sendDueReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/reminders] failed:", err);
    return NextResponse.json({ error: "Reminder run failed" }, { status: 500 });
  }
}
