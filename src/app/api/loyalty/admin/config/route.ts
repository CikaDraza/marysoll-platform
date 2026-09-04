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
import { requireCapability } from "@/lib/platform/capabilities-server";
import { LoyaltyConfig } from "@/models/LoyaltyConfig";
import { DEFAULT_LOYALTY_CONFIG } from "@/lib/loyalty/config";
import { assignPointsShopIds } from "@/lib/loyalty/pointsShopIdentity";

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
      referrerRewardPoints: z.number().min(0).max(100000).default(100),
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
      referrerRewardPoints: 100,
    }),
  milestones: z
    .array(
      z.object({
        heartsRequired: z.number().min(1).max(100),
        reward: rewardSchema,
      }),
    )
    .max(1), // Claudia/MVP: jedan milestone program
  // `id` je opcion NA ULAZU: nova ponuda ga još nema. Server ga dodeljuje i
  // prihvata postojeći samo ako pripada ovom salonu — browser ne bira
  // identitet ponude (vidi `assignPointsShopIds`).
  pointsShop: z
    .array(
      z.object({
        id: z.string().trim().max(64).optional(),
        costPoints: z.number().int().min(1).max(1_000_000),
        reward: rewardSchema,
      }),
    )
    .max(6),
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
  const denied = await requireCapability(auth.decoded.tenantId, "loyalty.rewards");
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
  const denied = await requireCapability(auth.decoded.tenantId, "loyalty.rewards");
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

  // Nagrada mora da nosi ono što obećava: procenat bez procenta i gratis
  // usluga bez naziva su konfiguracija koju klijentkinja ne može da iskoristi.
  for (const offer of parsed.data.pointsShop) {
    if (offer.reward.type !== "free_service" && offer.reward.value <= 0) {
      return NextResponse.json(
        { error: "Nagrada mora imati vrednost veću od nule." },
        { status: 400 },
      );
    }
    if (offer.reward.type === "percent" && offer.reward.value > 100) {
      return NextResponse.json(
        { error: "Procenat popusta ne može biti veći od 100." },
        { status: 400 },
      );
    }
    if (
      offer.reward.type === "free_service" &&
      !offer.reward.serviceName?.trim() &&
      !offer.reward.serviceId
    ) {
      return NextResponse.json(
        { error: "Gratis nagrada mora imati izabranu uslugu." },
        { status: 400 },
      );
    }
  }

  await connectToDB();
  // Id-jevi se čuvaju u odnosu na SAČUVANO stanje: izmena cene i promena
  // redosleda ne smeju da promene identitet ponude, jer već izdati vaučeri i
  // idempotency ključevi u letu pokazuju na njega.
  const current = await LoyaltyConfig.findOne({ tenantId: auth.decoded.tenantId })
    .select("pointsShop")
    .lean<{ pointsShop?: { id?: string }[] }>();
  const pointsShop = assignPointsShopIds(
    parsed.data.pointsShop,
    current?.pointsShop ?? [],
  );

  const config = await LoyaltyConfig.findOneAndUpdate(
    { tenantId: auth.decoded.tenantId },
    { $set: { ...parsed.data, pointsShop } },
    { upsert: true, new: true },
  ).lean();

  return NextResponse.json({ config });
}
