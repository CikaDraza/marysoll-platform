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
  "html": "string — TABLE layout email content kao string (samo inner template)",
  "blocks": [
    { "type": "hero",    "priority": 1, "data": { "headline": "string", "subheadline": "string" } },
    { "type": "text",    "priority": 2, "data": { "content": "string" } },
    { "type": "bullets", "priority": 3, "data": { "heading": "string", "items": ["string"] } },
    { "type": "cta",     "priority": 4, "data": { "text": "string", "url": "#" } }
  ]
}

VAŽNO:
HTML mora biti samo email CONTENT koji ide unutar postojećeg email wrappera.

NE generisati:
- <html>
- <head>
- <body>
- <!DOCTYPE>

Wrapper već sadrži:
- html dokument
- header (logo + naziv tenanta)
- footer (unsubscribe + settings)
- centralni container širine 600px

Zato generiši samo sadržaj emaila.

Pravila za HTML:
- koristiti TABLE layout
- inline CSS (bez <style> taga)
- širina tabele 100% (wrapper kontroliše max-width)
- kompatibilno sa Gmail, Outlook i Apple Mail
- NE koristiti flexbox ili grid
- koristiti samo <table>, <tr>, <td>, <img>, <a>, <p>, <strong>, <br>

Pravila za blocks:
- blocks mora imati 2–6 elemenata
- Dozvoljeni tipovi: hero, text, bullets, cta, divider, image
- priority označava redosled prikaza (1 = prvo)

SLIKA U EMAILU:
Ako sadržaj uključuje polje "imagePrompt" (nije null), OBAVEZNO:
1. Dodaj image blok u blocks niz: { "type": "image", "priority": 2, "data": { "url": "{{EMAIL_IMAGE_URL}}", "alt": "Campaign image" } }
2. U HTML-u umetni sliku odmah posle hero sekcije koristeći TAČNO ovaj placeholder:
   <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;"><tr><td align="center" style="padding:0;text-align:center;"><img src="{{EMAIL_IMAGE_URL}}" width="600" alt="Campaign image" style="max-width:100%;height:auto;display:block;margin:0 auto;border:0;" /></td></tr></table>
3. Pomeri ostale blokove na odgovarajući priority (hero=1, image=2, text=3, itd.)

VAŽNO:
- HTML mora biti jedna <table> struktura
- svi stilovi moraju biti inline
- NE dodavati komentare
- NE dodavati markdown
- NE dodavati tekst van JSON objekta
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

// ── Regenerate with strict content ────────────────────────────────────────────

const REGENERATE_SYSTEM_PROMPT = `
Ti si ekspert za HTML email templejte.

Dobijaš POSTOJEĆI HTML templejt i IZMENJEN sadržaj.
Tvoj zadatak je da PREPISUJEŠ HTML koristeći TAČNO i ISKLJUČIVO vrednosti iz izmenjenog sadržaja.

STROGA PRAVILA:
- Koristi TAČNO ove vrednosti — bez parafraziranja, bez izmene značenja
- Sačuvaj vizuelnu strukturu i stilove originalnog HTML-a (boje, padding, font-size, layout)
- Zameni samo tekstualne vrednosti i URL-ove
- Ako nema ctaUrl, ostavi href="#"
- ISPRAVI pravopisne greške u heroTitle i heroText (naslov i body tekst) — ne menjaj smisao, samo ispravi greške
- ISPRAVI slova bez dijakritika u srpskom latiničnom pismu u heroTitle i heroText:
  zameni "c" → "č" ili "ć" (prema kontekstu reči), "s" → "š", "z" → "ž", "dj" → "đ"
  Primeri: "pridruziti" → "pridružiti", "organizacija" → "organizacija", "cestitamo" → "čestitamo",
  "saljemo" → "šaljemo", "vise" → "više", "nase" → "naše", "bice" → "biće", "otici" → "otići"
- NE menjaj ctaText i ctaUrl — koristi ih tačno onako kako su dati

Odgovori ISKLJUČIVO validnim JSON objektom:
{
  "html": "string — ažurirani TABLE layout email content kao string (samo inner template)"
}

HTML pravila:
- TABLE layout, inline CSS, bez <html>/<head>/<body>/<!DOCTYPE>
- kompatibilno sa Gmail, Outlook i Apple Mail
- NE koristiti flexbox ili grid
- NE dodavati komentare, markdown, tekst van JSON-a
`;

export async function regenerateCampaignTemplate(
  existingHtml: string,
  content: {
    subject: string;
    previewText: string;
    heroTitle: string;
    heroText: string;
    ctaText: string;
    ctaUrl: string;
  },
): Promise<string> {
  const messages: DeepSeekMessage[] = [
    {
      role: "user",
      content: `Postojeći HTML:
${existingHtml}

Izmenjeni sadržaj (koristi TAČNO ove vrednosti):
${JSON.stringify(content, null, 2)}

Regeneriši HTML koristeći tačno ovaj sadržaj. Odgovori SAMO JSON objektom sa "html" poljem.`,
    },
  ];

  const response = await callDeepSeek({
    agent: "landing",
    messages,
    systemPrompt: REGENERATE_SYSTEM_PROMPT,
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

  return typeof parsed.html === "string" ? parsed.html : existingHtml;
}
