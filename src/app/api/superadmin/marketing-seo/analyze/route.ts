// POST /api/superadmin/marketing-seo/analyze
// Analyzes the marketing landing page for SEO quality.
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { analyzeMarketingLandingSeo } from "@/lib/ai/agents/marketingLandingSeoAgents";
import { buildMarketingLandingSnapshot } from "@/lib/seo/marketingLandingSnapshot";
import { crawlRenderedMarketingPage } from "@/lib/seo/crawlRenderedMarketingPage";
import { SeoAnalysisRun } from "@/models/SeoAnalysisRun";
import type { LandingRenderSnapshot } from "@/lib/seo/marketingLandingSnapshot";
import type {
  MarketingLandingStructure,
  PerformanceSeoSnapshot,
} from "@/types/marketing-landing";

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as {
      marketingLanding: MarketingLandingStructure;
      performance?: PerformanceSeoSnapshot;
      crawlUrl?: string;
    };
    const crawlUrl =
      body.crawlUrl ||
      process.env.MARKETING_SEO_CRAWL_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://marysoll.com";

    let crawlError: string | undefined;
    let snapshot: LandingRenderSnapshot;
    try {
      snapshot = await crawlRenderedMarketingPage(crawlUrl, body.performance);
    } catch (err) {
      crawlError = err instanceof Error ? err.message : "Rendered crawl failed";
      snapshot = buildMarketingLandingSnapshot(
        body.marketingLanding,
        body.performance,
      );
    }

    const result = {
      ...(await analyzeMarketingLandingSeo(snapshot)),
      snapshotSource: snapshot.source ?? "cms",
      crawlUrl,
      crawlError,
    };

    await connectToDB();
    const run = await SeoAnalysisRun.create({
      scope: "superadmin",
      page: "marketing-home",
      snapshot,
      crawlUrl,
      crawlError: crawlError ?? null,
      performance: body.performance ?? null,
      result,
    });

    return NextResponse.json({ ...result, runId: String(run._id) });
  } catch (err) {
    console.error("[POST /api/superadmin/marketing-seo/analyze]", err);
    return NextResponse.json({ error: "Greška pri SEO analizi" }, { status: 500 });
  }
}
