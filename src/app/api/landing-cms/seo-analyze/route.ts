import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { analyzeLandingPageSeo } from "@/lib/ai/agents/seoAgentLandingTheme";
import type { LandingStructure } from "@/types";
import { connectToDB } from "@/lib/db/mongodb";
import { resolveTenantLandingCrawlUrl } from "@/lib/seo/tenantSeoCrawl";
import { crawlRenderedMarketingPage } from "@/lib/seo/crawlRenderedMarketingPage";
import { SeoAnalysisRun } from "@/models/SeoAnalysisRun";

export async function POST(req: NextRequest) {
  try {
    const auth: AdminAuthResult = requireAdmin(req);
    if (!auth.success) return auth.response;
    if (!auth.decoded.tenantId) {
      return NextResponse.json(
        { error: "Tenant nije identifikovan" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const landingStructure = body.landingStructure as LandingStructure;
    const seoContext = body.seoContext;

    if (!landingStructure) {
      return NextResponse.json(
        { error: "landingStructure is required" },
        { status: 400 },
      );
    }

    await connectToDB();
    const crawlUrl = await resolveTenantLandingCrawlUrl(auth.decoded.tenantId);
    let renderedSnapshot;
    let crawlError: string | undefined;

    try {
      renderedSnapshot = await crawlRenderedMarketingPage(crawlUrl, undefined, "tenant-home");
    } catch (err) {
      crawlError = err instanceof Error ? err.message : "Rendered crawl failed";
    }

    const result = await analyzeLandingPageSeo({
      landingStructure,
      seoContext,
      renderedSnapshot,
      crawlUrl,
      crawlError,
    });

    await SeoAnalysisRun.create({
      scope: "tenant",
      page: "tenant-home",
      crawlUrl,
      crawlError: crawlError ?? null,
      snapshot: renderedSnapshot ?? { source: "cms", landingStructure },
      result,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/landing-cms/seo-analyze:", err);
    return NextResponse.json({ error: "SEO analysis failed" }, { status: 500 });
  }
}
