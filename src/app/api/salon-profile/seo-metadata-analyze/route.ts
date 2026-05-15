import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";
import { analyzeMetadataSeo } from "@/lib/ai/agents/metadataSeoAgent";
import type { SeoData } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req) as { decoded: DecodedToken } | NextResponse;
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const seo = body.seo as SeoData;
    const seoContext = body.seoContext;

    if (!seo) {
      return NextResponse.json({ error: "seo is required" }, { status: 400 });
    }

    const result = await analyzeMetadataSeo({ seo, seoContext });
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/salon-profile/seo-metadata-analyze:", err);
    return NextResponse.json(
      { error: "Metadata SEO analysis failed" },
      { status: 500 },
    );
  }
}
