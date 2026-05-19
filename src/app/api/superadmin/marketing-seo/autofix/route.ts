// POST /api/superadmin/marketing-seo/autofix
// AI rewrites marketing landing content to fix SEO issues.
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { callDeepSeek, AGENTS } from "@/lib/ai/agents";
import type { MarketingLandingStructure } from "@/types/marketing-landing";

interface AutofixInput {
  marketingLanding: MarketingLandingStructure;
  seoResult: {
    score: number;
    issues: string[];
    suggestions: string[];
    keywords: string[];
  };
}

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json() as AutofixInput;
    const { marketingLanding: ls, seoResult } = body;

    const messages = [
      {
        role: "system" as const,
        content: `You are a SaaS marketing copywriter. Rewrite landing page text to fix SEO issues.
Rules:
- Return ONLY the updated JSON object with the same structure as input
- Only modify text fields (headline, subheadline, description, features, etc.)
- Keep href, enabled, popular, price, period, icon fields unchanged
- Write in Serbian language (Latin script)
- Target SEO score 75-90
- No markdown, no explanation — pure JSON only`,
      },
      {
        role: "user" as const,
        content: `Current landing structure:\n${JSON.stringify(ls, null, 2)}\n\nSEO issues to fix:\n${seoResult.issues.join("\n")}\n\nSuggestions:\n${seoResult.suggestions.join("\n")}\n\nKeywords to include:\n${seoResult.keywords.join(", ")}`,
      },
    ];

    const response = await callDeepSeek({
      agent: "landingContent",
      messages,
      jsonMode: true,
    });

    if (!response.ok) throw new Error(`DeepSeek error: ${response.status}`);
    const data = await response.json() as { choices: { message: { content: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json|```/g, "").trim();
    const updated = JSON.parse(cleaned) as MarketingLandingStructure;

    return NextResponse.json({ marketingLanding: updated });
  } catch (err) {
    console.error("[POST /api/superadmin/marketing-seo/autofix]", err);
    return NextResponse.json({ error: "Greška pri auto-fix-u" }, { status: 500 });
  }
}
