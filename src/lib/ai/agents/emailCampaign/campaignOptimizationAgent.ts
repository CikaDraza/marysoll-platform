import {
  EmailCampaignContent,
  EmailCampaignOptimization,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";
import { callDeepSeek, DeepSeekMessage } from "../../agents";

const SYSTEM_PROMPT = `
Ti si AI optimizer za email kampanje.

Analiziraj sadržaj email kampanje i predloži poboljšanja. Odgovori ISKLJUČIVO validnim JSON objektom bez ikakvog teksta pre ili posle.

JSON mora imati TAČNO ovu strukturu (sva polja su obavezna):
{
  "improvedSubject": "string — poboljšana subject linija",
  "improvedPreview": "string — poboljšani preview tekst",
  "expectedOpenRate": 0.25,
  "expectedClickRate": 0.05,
  "suggestions": ["string", "string", "string"],
  "confidenceScore": 0.75
}

Pravila:
- expectedOpenRate i expectedClickRate su decimalni brojevi između 0 i 1 (npr. 0.25 = 25%)
- confidenceScore je decimalni broj između 0 i 1 koji predstavlja tvoje poverenje u predikcije
- suggestions mora biti niz sa 3–5 konkretnih preporuka kao stringovi
- NE dodavaj nikakve komentare, markdown, ni tekst van JSON-a
`;

export async function generateCampaignOptimization(
  input: EmailCampaignContent,
): Promise<EmailCampaignOptimization> {
  const messages: DeepSeekMessage[] = [
    {
      role: "user",
      content: `Email kampanja:
${JSON.stringify(input, null, 2)}

Analiziraj i predloži optimizacije. Odgovori SAMO JSON objektom.`,
    },
  ];

  const response = await callDeepSeek({
    agent: "landing",
    messages,
    systemPrompt: SYSTEM_PROMPT,
    jsonMode: true,
  });

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  return {
    improvedSubject:
      typeof parsed.improvedSubject === "string"
        ? parsed.improvedSubject
        : (typeof parsed.subject === "string" ? parsed.subject : ""),
    improvedPreview:
      typeof parsed.improvedPreview === "string"
        ? parsed.improvedPreview
        : (typeof parsed.previewText === "string" ? parsed.previewText : ""),
    expectedOpenRate:
      typeof parsed.expectedOpenRate === "number"
        ? parsed.expectedOpenRate
        : 0,
    expectedClickRate:
      typeof parsed.expectedClickRate === "number"
        ? parsed.expectedClickRate
        : 0,
    suggestions: Array.isArray(parsed.suggestions)
      ? (parsed.suggestions as string[]).filter((s) => typeof s === "string")
      : Array.isArray(parsed.insights)
        ? (parsed.insights as string[]).filter((s) => typeof s === "string")
        : [],
    confidenceScore:
      typeof parsed.confidenceScore === "number"
        ? parsed.confidenceScore
        : undefined,
  };
}
