import {
  EmailCampaignContent,
  EmailCampaignTemplate,
  EmailCampaignTemplateBlock,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";
import { callDeepSeek, DeepSeekMessage } from "../../agents";

const SYSTEM_PROMPT = `
Ti si ekspert za HTML email templejte.

Generiši email templejt i odgovori ISKLJUČIVO validnim JSON objektom bez ikakvog teksta pre ili posle.

JSON mora imati TAČNO ovu strukturu:
{
  "html": "string — kompletan HTML email kao string (TABLE layout, inline CSS, max 600px)",
  "blocks": [
    { "type": "hero",    "priority": 1, "data": { "headline": "string", "subheadline": "string" } },
    { "type": "text",    "priority": 2, "data": { "content": "string" } },
    { "type": "bullets", "priority": 3, "data": { "heading": "string", "items": ["string"] } },
    { "type": "cta",     "priority": 4, "data": { "text": "string", "url": "#" } }
  ]
}

Pravila za HTML:
- TABLE layout obavezno
- inline CSS (bez <style> taga)
- maksimalna širina 600px
- kompatibilno sa Gmail, Outlook, Apple Mail
- NE koristiti flexbox ili grid

Pravila za blocks:
- blocks mora biti niz sa 2–6 elemenata
- Dozvoljeni tipovi: hero, text, bullets, cta, divider, image
- priority je redosled prikaza (1 = prvo)
- NE dodavaj nikakve komentare, markdown, ni tekst van JSON-a
`;

export async function generateCampaignTemplate(
  input: EmailCampaignContent,
): Promise<EmailCampaignTemplate> {
  const messages: DeepSeekMessage[] = [
    {
      role: "user",
      content: `Sadržaj emaila:
${JSON.stringify(input, null, 2)}

Generiši HTML templejt i blocks niz. Odgovori SAMO JSON objektom.`,
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

  const html = typeof parsed.html === "string" ? parsed.html : "";

  // Normalize blocks — ensure array with valid type/priority/data shape
  const rawBlocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
  const blocks: EmailCampaignTemplateBlock[] = (
    rawBlocks as Record<string, unknown>[]
  )
    .filter(
      (b) =>
        typeof b === "object" &&
        b !== null &&
        typeof b.type === "string" &&
        typeof b.data === "object",
    )
    .map((b, i) => ({
      type: b.type as string,
      priority: typeof b.priority === "number" ? b.priority : i + 1,
      data: (b.data as Record<string, unknown>) ?? {},
    }));

  // If AI returned no blocks, synthesize minimal blocks from content
  if (blocks.length === 0) {
    blocks.push(
      {
        type: "hero",
        priority: 1,
        data: {
          headline: input.title,
          subheadline: input.subtitle ?? "",
        },
      },
      {
        type: "text",
        priority: 2,
        data: { content: input.body },
      },
    );
    if (input.bullets && input.bullets.length > 0) {
      blocks.push({
        type: "bullets",
        priority: 3,
        data: { items: input.bullets },
      });
    }
    blocks.push({
      type: "cta",
      priority: blocks.length + 1,
      data: { text: input.ctaText, url: "#" },
    });
  }

  return { html, blocks };
}
