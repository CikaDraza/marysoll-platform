// POST /api/superadmin/marketing-seo/typo-fix
// AI corrects ONLY spelling/typos in marketing landing copy (no SEO rewrite).
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { typoFixMarketingLanding } from "@/lib/ai/agents/marketingLandingSeoAgents";
import type { MarketingLandingStructure } from "@/types/marketing-landing";

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as {
      marketingLanding: MarketingLandingStructure;
    };
    const updated = await typoFixMarketingLanding(body.marketingLanding);
    return NextResponse.json({ marketingLanding: updated });
  } catch (err) {
    console.error("[POST /api/superadmin/marketing-seo/typo-fix]", err);
    return NextResponse.json(
      { error: "Greška pri ispravci typo grešaka" },
      { status: 500 },
    );
  }
}
