// POST /api/superadmin/marketing-seo/analyze
// Analyzes the marketing landing page for SEO quality.
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { callDeepSeek } from "@/lib/ai/agents";
import type { MarketingLandingStructure } from "@/types/marketing-landing";

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json() as { marketingLanding: MarketingLandingStructure };
    const { marketingLanding: ls } = body;

    const contentSummary = JSON.stringify({
      hero: ls?.hero,
      howItWorks: ls?.howItWorks,
      features: ls?.features,
      pricing: ls?.pricing,
      footer: ls?.footer,
      seo: ls?.seo,
    }, null, 2);

    const messages = [
      {
        role: "system" as const,
        content: `You are an expert SEO strategist for SaaS marketing websites.
Analyze the landing page content and return a JSON object with:
- score: number 0-100
- issues: string[] (specific problems found)
- suggestions: string[] (actionable improvements)
- keywords: string[] (recommended keywords to add)

Return ONLY valid JSON. No markdown, no explanation.`,
      },
      {
        role: "user" as const,
        content: `Analyze this SaaS marketing landing page content for SEO:\n\n${contentSummary}`,
      },
    ];

    const response = await callDeepSeek({
      agent: "seoLandingTheme",
      messages,
      jsonMode: true,
    });

    if (!response.ok) throw new Error(`DeepSeek error: ${response.status}`);
    const data = await response.json() as { choices: { message: { content: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned) as {
      score: number;
      issues: string[];
      suggestions: string[];
      keywords: string[];
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/superadmin/marketing-seo/analyze]", err);
    return NextResponse.json({ error: "Greška pri SEO analizi" }, { status: 500 });
  }
}
