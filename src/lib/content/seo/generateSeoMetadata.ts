/**
 * Shared Content Composer SEO metadata generator.
 *
 * Generates SEO metadata for landing pages via DeepSeek.
 * Replaces services/generateSeoForLanding.ts.
 */
import "server-only";

import { callDeepSeek, DeepSeekMessage } from "@/lib/ai/agents";

export interface SeoInput {
  titleSeed?: string;
  content: string;
  keywords?: string[];
}

export interface SeoOutput {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  keywords: string[];
}

const SEO_SYSTEM_PROMPT = `You are an SEO expert. Generate SEO metadata in Serbian (Latin script) for a landing page.
Output must be a valid JSON object matching this schema:
{
  "title": string,       // max 60 chars
  "description": string, // max 160 chars
  "ogTitle": string,     // max 60 chars
  "ogDescription": string, // max 160 chars
  "ogImage": string,     // (optional) URL
  "keywords": string[]   // array of relevant keywords
}
Follow the rules: title and ogTitle max 60 characters, description and ogDescription max 160 characters.
Ensure keywords are relevant to the content. OG tags should be catchy for social media.`;

export async function generateSeoMetadata(input: SeoInput): Promise<SeoOutput> {
  const userPrompt = `Generate SEO metadata for a landing page based on the following:

SEED TITLE: ${input.titleSeed || "None"}
KEYWORDS: ${input.keywords?.join(", ") || "None"}
PAGE CONTENT:
${input.content}`;

  const messages: DeepSeekMessage[] = [{ role: "user", content: userPrompt }];

  const response = await callDeepSeek({
    agent: "seo",
    messages,
    systemPrompt: SEO_SYSTEM_PROMPT,
    jsonMode: true,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SEO agent error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in SEO agent response");

  try {
    return JSON.parse(content) as SeoOutput;
  } catch (e) {
    throw new Error(`SEO agent returned invalid JSON: ${e}`);
  }
}
