import {
  EmailCampaignContent,
  EmailCampaignStrategy,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";
import { callDeepSeek, DeepSeekMessage } from "../../agents";

const SYSTEM_PROMPT = `
Ti si copywriter za beauty email kampanje.

Generiši sadržaj emaila na osnovu strategije i odgovori ISKLJUČIVO validnim JSON objektom bez ikakvog teksta pre ili posle.

JSON mora imati TAČNO ovu strukturu (sva polja su obavezna):
{
  "subject": "string — subject linija emaila",
  "previewText": "string — kratki preview tekst (do 90 znakova)",
  "title": "string — naslov u telu emaila",
  "subtitle": "string — podnaslov u telu emaila",
  "body": "string — glavni tekst emaila",
  "bullets": ["string", "string", "string"],
  "ctaText": "string — tekst na dugmetu poziva na akciju",
  "imagePrompt": "string OR null — kratki engleski opis slike za AI generisanje (npr. 'elegant nail salon interior with flowers and candles'). Dodaj SAMO ako bi slika vizuelno obogatila email (promocije, sezonske kampanje, novi tretmani). Za informativne ili transakcione emailove postavi null."
}

Pravila:
- bullets mora biti niz sa 3–5 string elemenata
- subject i previewText su obavezni i moraju biti popunjeni
- imagePrompt je kratak engleski opis (max 20 reči), ili null
- NE dodavaj nikakve komentare, markdown, ni tekst van JSON-a
`;

export async function generateCampaignContent(
  input: EmailCampaignStrategy,
): Promise<EmailCampaignContent> {
  const messages: DeepSeekMessage[] = [
    {
      role: "user",
      content: `Strategija kampanje:
${JSON.stringify(input, null, 2)}

Generiši sadržaj emaila. Odgovori SAMO JSON objektom.`,
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

  // Normalize — guard against AI field name variance
  return {
    subject: typeof parsed.subject === "string" ? parsed.subject : "",
    previewText:
      typeof parsed.previewText === "string" ? parsed.previewText : "",
    title: typeof parsed.title === "string" ? parsed.title : "",
    subtitle: typeof parsed.subtitle === "string" ? parsed.subtitle : undefined,
    body: typeof parsed.body === "string" ? parsed.body : "",
    bullets: Array.isArray(parsed.bullets)
      ? (parsed.bullets as string[]).filter((s) => typeof s === "string")
      : Array.isArray(parsed.tips)
        ? (parsed.tips as string[]).filter((s) => typeof s === "string")
        : [],
    ctaText: typeof parsed.ctaText === "string" ? parsed.ctaText : "",
    imagePrompt:
      typeof parsed.imagePrompt === "string" && parsed.imagePrompt.trim()
        ? parsed.imagePrompt.trim()
        : null,
  };
}
