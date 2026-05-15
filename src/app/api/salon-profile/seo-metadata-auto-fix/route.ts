import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";
import { autoFixMetadataSeo } from "@/lib/ai/agents/metadataSeoAgent";
import type { SeoData } from "@/types";
import type { MetadataSeoAnalysisOutput } from "@/lib/ai/agents/metadataSeoAgent";

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req) as { decoded: DecodedToken } | NextResponse;
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const seo = body.seo as SeoData;
    const seoResult = body.seoResult as MetadataSeoAnalysisOutput;
    const seoContext = body.seoContext;

    if (!seo || !seoResult) {
      return NextResponse.json(
        { error: "seo and seoResult are required" },
        { status: 400 },
      );
    }

    const result = await autoFixMetadataSeo({ seo, seoResult, seoContext });
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/salon-profile/seo-metadata-auto-fix:", err);
    return NextResponse.json(
      { error: "Metadata SEO auto-fix failed" },
      { status: 500 },
    );
  }
}
