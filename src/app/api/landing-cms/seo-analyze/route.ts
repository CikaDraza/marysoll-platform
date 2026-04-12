import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";
import { analyzeLandingPageSeo } from "@/lib/ai/agents/seoAgentLandingTheme";
import type { LandingStructure } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const auth = (await requireAdmin(req)) as
      | { decoded: DecodedToken }
      | NextResponse;
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const landingStructure = body.landingStructure as LandingStructure;

    if (!landingStructure) {
      return NextResponse.json(
        { error: "landingStructure is required" },
        { status: 400 },
      );
    }

    const result = await analyzeLandingPageSeo({ landingStructure });
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/landing-cms/seo-analyze:", err);
    return NextResponse.json(
      { error: "SEO analysis failed" },
      { status: 500 },
    );
  }
}
