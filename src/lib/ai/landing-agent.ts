/**
 * Landing Agent — generates newsletter landing page blocks and SEO metadata
 * Uses API_KEY_NEWSLETTER_LANDING_GENERATION
 */

import { callDeepSeek } from "./agents";
import type { DeepSeekMessage } from "./agents";

export interface LandingBlock {
  id?: string;
  _id?: string;
  type: string;
  priority: number;
  data: Record<string, unknown>;
}

export interface LandingSeoData {
  title: string;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
}

export interface LandingGenerationResult {
  blocks: LandingBlock[];
  seo: LandingSeoData;
}

const LANDING_SYSTEM_PROMPT = `
Ti si ekspert za kreiranje landing stranica za beauty salone.
Tvoj zadatak je generisanje JSON strukture za landing stranicu.

Dostupni tipovi blokova:
- HeroPrimaryBlock: Glavni hero sa naslovom, podnaslovima, CTA dugmetom
- HeroVisualBlock: Hero sa slikom
- ContentSplitBlock: Tekst + slika pored sebe
- FeatureGridBlock: Grid sa prednostima/uslugama
- CTABlock: Call-to-action sekcija
- ArticleSectionBlock: Tekstualni članak
- PricingBlock: Cenovnik
- TestimonialBlock: Utisci klijenata

Odgovaraj ISKLJUČIVO validnim JSON objektom u formatu:
{
  "blocks": [
    {
      "type": "ime_bloka",
      "priority": 1,
      "data": {
        "heading": "...",
        "subheading": "...",
        "ctaText": "...",
        "ctaUrl": "...",
        "items": [...],
        "imageUrl": ""
      }
    }
  ],
  "seo": {
    "title": "...",
    "description": "...",
    "keywords": ["...", "..."],
    "ogTitle": "...",
    "ogDescription": "...",
    "ogImage": ""
  }
}

Bez markdown, bez objašnjenja — samo JSON.
`;

export async function generateLandingPage(
  campaignSummary: string,
  salonName: string,
  tone: "informative" | "friendly" | "urgent" | "premium" = "friendly",
): Promise<LandingGenerationResult> {
  const messages: DeepSeekMessage[] = [
    {
      role: "user",
      content: `Kreiraj landing stranicu za sledeću kampanju:
Salon: ${salonName}
Ton: ${tone}
Opis kampanje: ${campaignSummary}

Generiši 4-6 blokova koji zajedno čine koherentnu landing stranicu.`,
    },
  ];

  const response = await callDeepSeek({
    agent: "landing",
    messages,
    systemPrompt: LANDING_SYSTEM_PROMPT,
    jsonMode: true,
  });

  if (!response.ok) {
    throw new Error(`Landing agent error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(content) as LandingGenerationResult;
    return {
      blocks: parsed.blocks ?? [],
      seo: parsed.seo ?? {
        title: "",
        description: "",
        keywords: [],
        ogTitle: "",
        ogDescription: "",
        ogImage: "",
      },
    };
  } catch {
    throw new Error("Failed to parse landing page JSON from AI response");
  }
}

export async function generateSeoMetadata(
  content: string,
  salonName: string,
): Promise<LandingSeoData> {
  const messages: DeepSeekMessage[] = [
    {
      role: "user",
      content: `Generiši SEO metapodatke za sledeći sadržaj beauty salona "${salonName}":

${content}

Vrati SAMO JSON objekat:
{
  "title": "max 60 karaktera",
  "description": "max 160 karaktera",
  "keywords": ["5-8 ključnih reči"],
  "ogTitle": "max 60 karaktera",
  "ogDescription": "max 200 karaktera",
  "ogImage": ""
}`,
    },
  ];

  const response = await callDeepSeek({
    agent: "landing",
    messages,
    jsonMode: true,
  });

  if (!response.ok) {
    throw new Error(`SEO agent error: ${response.status}`);
  }

  const data = await response.json();
  const content2 = data.choices?.[0]?.message?.content ?? "{}";

  try {
    return JSON.parse(content2) as LandingSeoData;
  } catch {
    return {
      title: "",
      description: "",
      keywords: [],
      ogTitle: "",
      ogDescription: "",
      ogImage: "",
    };
  }
}
