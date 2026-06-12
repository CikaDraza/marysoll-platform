import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { analyzeSeo } from "@/lib/ai/agents/seo/analyzeSeo";
import type { SeoData } from "@/types";
import { connectToDB } from "@/lib/db/mongodb";
import {
  crawlTenantSeoPages,
  resolveTenantLandingCrawlUrl,
} from "@/lib/seo/tenantSeoCrawl";
import {
  buildTechnicalAudit,
  auditDuplicateMetadata,
} from "@/lib/seo/technicalAudit";
import { fetchSiteSignals } from "@/lib/seo/fetchSiteSignals";
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
    const seoContext = body.seoContext as
      | { salon?: { name?: string; city?: string } }
      | undefined;

    if (!seo) {
      return NextResponse.json({ error: "seo is required" }, { status: 400 });
    }

    await connectToDB();
    const crawlUrl = await resolveTenantLandingCrawlUrl(auth.decoded.tenantId);
    const renderedPages = await crawlTenantSeoPages(crawlUrl);

    const siteSignals = await fetchSiteSignals(crawlUrl);
    const withSnapshot = renderedPages.flatMap((p) =>
      p.snapshot ? [{ page: p.page, snapshot: p.snapshot }] : [],
    );
    const perPageTechnical = withSnapshot.map((p, i) =>
      buildTechnicalAudit({
        snapshot: p.snapshot,
        page: p.page,
        siteSignals: i === 0 ? siteSignals : undefined,
      }),
    );
    const duplicates = auditDuplicateMetadata(
      withSnapshot.map((p) => ({
        key: p.page,
        title: p.snapshot.finalMetadata.title,
        description: p.snapshot.finalMetadata.description,
      })),
    );

    const salonName = seoContext?.salon?.name?.trim() || "Salon";
    const result = await analyzeSeo({
      scope: "tenant-metadata",
      pages: withSnapshot.map((p) => ({ key: p.page, snapshot: p.snapshot })),
      technical: perPageTechnical,
      crossPageFindings: duplicates,
      businessContext: {
        brand: salonName,
        productCategory: "Beauty salon services and online booking",
        audience: "Local beauty clients",
        city: seoContext?.salon?.city,
        scopeLabel: salonName,
      },
      agents: ["metadata"],
      crawlUrl,
      crawlError:
        renderedPages
          .map((p) => p.error)
          .filter(Boolean)
          .join(" | ") || undefined,
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
