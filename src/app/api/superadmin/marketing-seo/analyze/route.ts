// POST /api/superadmin/marketing-seo/analyze
// Analyzes the marketing landing page for SEO quality.
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { analyzeSeo } from "@/lib/ai/agents/seo/analyzeSeo";
import { buildMarketingLandingSnapshot } from "@/lib/seo/marketingLandingSnapshot";
import { crawlRenderedMarketingPage } from "@/lib/seo/crawlRenderedMarketingPage";
import { buildTechnicalAudit } from "@/lib/seo/technicalAudit";
import { fetchSiteSignals } from "@/lib/seo/fetchSiteSignals";
import { SeoAnalysisRun } from "@/models/SeoAnalysisRun";
import type { LandingRenderSnapshot } from "@/lib/seo/marketingLandingSnapshot";
import type {
  MarketingLandingStructure,
  PerformanceSeoSnapshot,
} from "@/types/marketing-landing";
import { platformOrigin } from "@/lib/platform/host-context";

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
      // Marketing sajt OVOG okruženja — BEZ hosta zahteva, jer zahtev stiže sa
      // superadmin.marysoll.com, a crawl-uje se javni sajt.
      platformOrigin();

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

    const siteSignals = await fetchSiteSignals(crawlUrl);
    const technical = buildTechnicalAudit({ snapshot, siteSignals });

    const result = await analyzeSeo({
      scope: "platform",
      pages: [{ key: "home", snapshot }],
      technical: [technical],
      businessContext: {
        brand: snapshot.businessContext.brand,
        productCategory: snapshot.businessContext.productCategory,
        audience: snapshot.businessContext.audience,
        scopeLabel: "Marysoll marketing platforma",
      },
      agents: ["content", "cta", "metadata"],
      crawlUrl,
      crawlError,
    });

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
