import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Plan } from "@/models/Plan";

/**
 * POST /api/seed/paddle-plans   { secret: string }
 * GET  /api/seed/paddle-plans?secret=...
 *
 * One-time seed: UPSERT-uje Plan dokumente (maria/claudia/kiki) sa cenama
 * iz marysoll.com/pricing i Paddle product/price ID-jevima.
 *
 * Paddle ID-jevi se biraju prema NEXT_PUBLIC_PADDLE_ENV (production | sandbox).
 * Pošto je baza ista, ponovno pokretanje seed-a prepisuje ID-jeve aktivnog
 * okruženja — kad menjaš NEXT_PUBLIC_PADDLE_ENV, ponovo pokreni seed.
 *
 * Za sada samo mesečna pretplata — paddleYearlyPriceId ostaje null.
 *
 * Bezbednost: omogućeno samo kad je ENABLE_SEED="true" (kill-switch — na
 * produkciji ostaviti nepostavljeno/false) + gated preko SEED_SECRET.
 */

interface PaddleIds {
  paddleProductId: string | null;
  paddleMonthlyPriceId: string | null;
  paddleYearlyPriceId: string | null;
}

const PADDLE_IDS: Record<
  "production" | "sandbox",
  Record<"claudia" | "kiki", PaddleIds>
> = {
  production: {
    claudia: {
      paddleProductId: "pro_01kt4rrc7c4191yp7brq6dfcrb",
      paddleMonthlyPriceId: "pri_01kt4s5cw7qv435bes0vzgcyzm",
      paddleYearlyPriceId: null,
    },
    kiki: {
      paddleProductId: "pro_01kt4rk9x06gpt1rhe6b15285m",
      paddleMonthlyPriceId: "pri_01kt4s98dkdeedhr3zfk6sjvpm",
      paddleYearlyPriceId: null,
    },
  },
  sandbox: {
    claudia: {
      paddleProductId: "pro_01kt5d02c4pcxs333zm6bby5tx",
      paddleMonthlyPriceId: "pri_01kt5d4bvpx8y9h43znr70yygb",
      paddleYearlyPriceId: null,
    },
    kiki: {
      paddleProductId: "pro_01kt5d86menk0e72t2vj4czp04",
      paddleMonthlyPriceId: "pri_01kt5da6naszp481fkzgz3zg6c",
      paddleYearlyPriceId: null,
    },
  },
};

const NO_PADDLE: PaddleIds = {
  paddleProductId: null,
  paddleMonthlyPriceId: null,
  paddleYearlyPriceId: null,
};

const BASE_PLANS: Array<{
  slug: "maria" | "claudia" | "kiki";
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  isHighlighted: boolean;
  sortOrder: number;
  billingProvider: "internal" | "paddle";
}> = [
  {
    slug: "maria",
    name: "Maria",
    description: "Idealno za početak i prve online rezervacije.",
    priceMonthly: 0,
    priceYearly: 0,
    isHighlighted: false,
    sortOrder: 1,
    billingProvider: "internal",
  },
  {
    slug: "claudia",
    name: "Claudia",
    description: "Za aktivne salone koji žele manje poruka i više termina.",
    priceMonthly: 19,
    priceYearly: 0,
    isHighlighted: true,
    sortOrder: 2,
    billingProvider: "paddle",
  },
  {
    slug: "kiki",
    name: "Kiki",
    description: "Za salone sa timom, domenom i naprednim izveštajima.",
    priceMonthly: 49,
    priceYearly: 0,
    isHighlighted: false,
    sortOrder: 3,
    billingProvider: "paddle",
  },
];

async function runSeed(secret: string | null) {
  // Kill-switch: seed radi samo kad je ENABLE_SEED izričito "true".
  // Na produkciji ostaviti nepostavljeno (ili "false") → endpoint je isključen.
  if (process.env.ENABLE_SEED !== "true") {
    return NextResponse.json(
      { error: "Seed je onemogućen (ENABLE_SEED nije postavljen na 'true')." },
      { status: 403 },
    );
  }

  const seedSecret = process.env.SEED_SECRET;

  if (!seedSecret) {
    return NextResponse.json(
      { error: "Seed endpoint is disabled (SEED_SECRET not configured)." },
      { status: 403 },
    );
  }

  if (!secret || secret !== seedSecret) {
    return NextResponse.json({ error: "Invalid seed secret." }, { status: 401 });
  }

  await connectToDB();

  const env =
    process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox" ? "sandbox" : "production";
  const ids = PADDLE_IDS[env];

  const results = [];
  for (const base of BASE_PLANS) {
    const paddle =
      base.slug === "claudia"
        ? ids.claudia
        : base.slug === "kiki"
          ? ids.kiki
          : NO_PADDLE;

    const updated = await Plan.findOneAndUpdate(
      { slug: base.slug },
      {
        $set: {
          name: base.name,
          description: base.description,
          priceMonthly: base.priceMonthly,
          priceYearly: base.priceYearly,
          isActive: true,
          isHighlighted: base.isHighlighted,
          sortOrder: base.sortOrder,
          billingProvider: base.billingProvider,
          paddleProductId: paddle.paddleProductId,
          paddleMonthlyPriceId: paddle.paddleMonthlyPriceId,
          paddleYearlyPriceId: paddle.paddleYearlyPriceId,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    )
      .select(
        "slug name priceMonthly billingProvider paddleProductId paddleMonthlyPriceId paddleYearlyPriceId isActive",
      )
      .lean();

    results.push(updated);
  }

  return NextResponse.json({ success: true, env, plans: results });
}

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") ?? "localhost";
  const { searchParams } = new URL(req.url, `http://${host}`);
  return runSeed(searchParams.get("secret"));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { secret } = (body ?? {}) as { secret?: string };
  return runSeed(secret ?? null);
}
