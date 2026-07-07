/**
 * Growth Studio — admin konfiguracija loyalty programa.
 *
 * GET  → postojeća konfiguracija ili defaulti (dokument se ne kreira na GET)
 * PUT  → Zod-validiran upsert
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { LoyaltyConfig } from "@/models/LoyaltyConfig";
import { DEFAULT_LOYALTY_CONFIG } from "@/lib/loyalty/config";

const rewardSchema = z.object({
  type: z.enum(["percent", "fixed", "free_service"]),
  value: z.number().min(0),
  serviceId: z.string().nullish(),
  serviceName: z.string().optional().default(""),
  expiresDays: z.number().min(1).max(365).default(90),
});

const configSchema = z.object({
  enabled: z.boolean(),
  currencies: z.object({
    hearts: z.object({
      enabled: z.boolean(),
      nameOne: z.string().min(1).max(30),
      nameFew: z.string().min(1).max(30),
      nameMany: z.string().min(1).max(30),
      emoji: z.string().max(8),
    }),
    points: z.object({
      enabled: z.boolean(),
      nameOne: z.string().min(1).max(30),
      nameFew: z.string().min(1).max(30),
      nameMany: z.string().min(1).max(30),
      emoji: z.string().max(8),
      per100Rsd: z.number().min(0).max(1000),
    }),
  }),
  earning: z.object({
    heartsPerCompletedVisit: z.number().min(0).max(10),
    welcomeBonusPoints: z.number().min(0).max(100000),
    checkinPoints: z.number().min(0).max(100000).default(10),
  }),
  streak: z
    .object({ windowDays: z.number().min(1).max(365) })
    .default({ windowDays: 45 }),
  sharing: z
    .object({
      enabled: z.boolean(),
      friendReward: rewardSchema,
      maxActivePerClient: z.number().min(1).max(50),
    })
    .default({
      enabled: false,
      friendReward: {
        type: "percent",
        value: 15,
        serviceName: "",
        expiresDays: 30,
      },
      maxActivePerClient: 3,
    }),
  milestones: z
    .array(
      z.object({
        heartsRequired: z.number().min(1).max(100),
        reward: rewardSchema,
      }),
    )
    .max(1), // Claudia/MVP: jedan milestone program
  pointsShop: z
    .array(
      z.object({ costPoints: z.number().min(1), reward: rewardSchema }),
    )
    .max(3),
  noShowPolicy: z.object({
    mode: z.enum(["none", "streak_reset", "hearts_penalty"]),
    heartsPenalty: z.number().min(0).max(10),
  }),
  autoComplete: z.object({
    enabled: z.boolean(),
    promptAfterHours: z.number().min(1).max(168),
    autoAfterHours: z.number().min(2).max(336),
  }),
  celebration: z.object({
    intensity: z.enum(["off", "subtle", "normal", "max"]),
  }),
  antiAbuse: z.object({
    maxHeartsPerDay: z.number().min(1).max(100),
    maxPointsPerDay: z.number().min(1).max(1000000),
  }),
});

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.success) return auth.response;
  const denied = await requireFeature(auth.decoded.tenantId, "loyaltyCore");
  if (denied) return denied;

  await connectToDB();
  const config = await LoyaltyConfig.findOne({
    tenantId: auth.decoded.tenantId,
  }).lean();

  return NextResponse.json({
    config: config ?? DEFAULT_LOYALTY_CONFIG,
    isDefault: !config,
  });
}

export async function PUT(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.success) return auth.response;
  const denied = await requireFeature(auth.decoded.tenantId, "loyaltyCore");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nevalidan JSON" }, { status: 400 });
  }

  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nevalidna konfiguracija", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (
    parsed.data.autoComplete.autoAfterHours <=
    parsed.data.autoComplete.promptAfterHours
  ) {
    return NextResponse.json(
      { error: "Auto-complete rok mora biti veći od roka za podsetnik" },
      { status: 400 },
    );
  }

  await connectToDB();
  const config = await LoyaltyConfig.findOneAndUpdate(
    { tenantId: auth.decoded.tenantId },
    { $set: parsed.data },
    { upsert: true, new: true },
  ).lean();

  return NextResponse.json({ config });
}
