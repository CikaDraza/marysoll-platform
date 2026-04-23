import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";
import { autoFixLandingContent } from "@/lib/ai/agents/landingContentAgent";
import type { LandingStructure } from "@/types";
import type { SeoLandingAnalysisOutput } from "@/lib/ai/agents/seoAgentLandingTheme";

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req) as { decoded: DecodedToken } | NextResponse;
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const landingStructure = body.landingStructure as LandingStructure;
    const seoResult = body.seoResult as SeoLandingAnalysisOutput;

    if (!landingStructure || !seoResult) {
      return NextResponse.json(
        { error: "landingStructure and seoResult are required" },
        { status: 400 },
      );
    }

    const result = await autoFixLandingContent({ landingStructure, seoResult });
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/landing-cms/auto-fix:", err);
    return NextResponse.json({ error: "Auto-fix failed" }, { status: 500 });
  }
}
