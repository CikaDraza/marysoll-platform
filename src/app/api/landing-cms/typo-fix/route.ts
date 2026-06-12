// POST /api/landing-cms/typo-fix
// AI corrects ONLY spelling/typos in tenant landing copy (no SEO rewrite).
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";
import { typoFixLandingContent } from "@/lib/ai/agents/landingContentAgent";
import type { LandingStructure } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req) as { decoded: DecodedToken } | NextResponse;
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const landingStructure = body.landingStructure as LandingStructure;

    if (!landingStructure) {
      return NextResponse.json(
        { error: "landingStructure is required" },
        { status: 400 },
      );
    }

    const result = await typoFixLandingContent(landingStructure);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/landing-cms/typo-fix:", err);
    return NextResponse.json(
      { error: "Greška pri ispravci typo grešaka" },
      { status: 500 },
    );
  }
}
