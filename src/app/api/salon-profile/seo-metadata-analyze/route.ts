import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { analyzeMetadataSeo } from "@/lib/ai/agents/metadataSeoAgent";
import type { SeoData } from "@/types";
import { connectToDB } from "@/lib/db/mongodb";
import {
  crawlTenantSeoPages,
  resolveTenantLandingCrawlUrl,
} from "@/lib/seo/tenantSeoCrawl";
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
    const seo = body.seo as SeoData;
    const seoContext = body.seoContext;

    if (!seo) {
      return NextResponse.json({ error: "seo is required" }, { status: 400 });
    }

    await connectToDB();
    const crawlUrl = await resolveTenantLandingCrawlUrl(auth.decoded.tenantId);
    const renderedPages = await crawlTenantSeoPages(crawlUrl);
    const result = await analyzeMetadataSeo({
      seo,
      seoContext,
      renderedPages,
      crawlUrl,
    });

    await SeoAnalysisRun.create({
      scope: "tenant",
      page: "tenant-metadata",
      crawlUrl,
      crawlError:
        renderedPages
          .map((page) => page.error)
          .filter(Boolean)
          .join(" | ") || null,
      snapshot: { pages: renderedPages },
      result,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/salon-profile/seo-metadata-analyze:", err);
    return NextResponse.json(
      { error: "Metadata SEO analysis failed" },
      { status: 500 },
    );
  }
}
