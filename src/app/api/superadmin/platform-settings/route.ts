/**
 * GET  /api/superadmin/platform-settings — read current settings
 * POST /api/superadmin/platform-settings — update settings
 *
 * Settings stored in env/DB. For now uses a simple in-memory singleton
 * that reads defaults from env and can be overridden at runtime.
 *
 * Key settings:
 *   defaultTrialDays      — how many trial days new signups get (default: 30)
 *   trialMode             — "free" (no card) | "card_required" (card first, refundable)
 *   requireEmailVerification — bool
 *   autoApproveTrials     — bool (auto-activate trial on email verify)
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/auth/auth-server";

// Simple in-memory store for platform settings.
// In production, persist these in a DB collection (e.g., PlatformSettings model).
// For now they're initialized from env vars.
const settings = {
  defaultTrialDays: parseInt(process.env.DEFAULT_TRIAL_DAYS ?? "30"),
  trialMode: (process.env.TRIAL_MODE ?? "free") as "free" | "card_required",
  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== "false",
  autoApproveTrials: process.env.AUTO_APPROVE_TRIALS !== "false",
  platformName: process.env.PLATFORM_NAME ?? "Marysoll",
  supportEmail: process.env.SUPPORT_EMAIL ?? "podrska@marysoll.com",
  maxTenantsPerUser: parseInt(process.env.MAX_TENANTS_PER_USER ?? "1"),
};

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({ success: true, settings });
}

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB(); // ensure connection for future DB persistence

    const body = await req.json();

    // Validate and apply only known settings
    if (body.defaultTrialDays !== undefined) {
      const days = parseInt(body.defaultTrialDays);
      if (days >= 1 && days <= 365) settings.defaultTrialDays = days;
    }
    if (body.trialMode !== undefined) {
      if (["free", "card_required"].includes(body.trialMode)) {
        settings.trialMode = body.trialMode;
      }
    }
    if (body.requireEmailVerification !== undefined) {
      settings.requireEmailVerification = Boolean(body.requireEmailVerification);
    }
    if (body.autoApproveTrials !== undefined) {
      settings.autoApproveTrials = Boolean(body.autoApproveTrials);
    }
    if (body.supportEmail && typeof body.supportEmail === "string") {
      settings.supportEmail = body.supportEmail.trim();
    }

    return NextResponse.json({ success: true, settings });
  } catch (err) {
    console.error("POST /api/superadmin/platform-settings:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
