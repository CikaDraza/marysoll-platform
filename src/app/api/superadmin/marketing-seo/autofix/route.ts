// POST /api/superadmin/marketing-seo/autofix
// AI rewrites marketing landing content to fix SEO issues.
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { autoFixMarketingLandingSeo } from "@/lib/ai/agents/marketingLandingSeoAgents";
import { buildMarketingLandingSnapshot } from "@/lib/seo/marketingLandingSnapshot";
import type {
  MarketingLandingStructure,
  MarketingSeoAnalysisResult,
  PerformanceSeoSnapshot,
} from "@/types/marketing-landing";

interface AutofixInput {
  marketingLanding: MarketingLandingStructure;
  seoResult: {
    score: number;
    issues: string[];
    suggestions: string[];
    keywords: string[];
  };
  performance?: PerformanceSeoSnapshot;
}

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json() as AutofixInput;
    const { marketingLanding: ls, seoResult } = body;
    const snapshot = buildMarketingLandingSnapshot(ls, body.performance);
    const updated = await autoFixMarketingLandingSeo({
      marketingLanding: ls,
      snapshot,
      seoResult: seoResult as MarketingSeoAnalysisResult,
    });

    return NextResponse.json({ marketingLanding: updated });
  } catch (err) {
    console.error("[POST /api/superadmin/marketing-seo/autofix]", err);
    return NextResponse.json({ error: "Greška pri auto-fix-u" }, { status: 500 });
  }
}
