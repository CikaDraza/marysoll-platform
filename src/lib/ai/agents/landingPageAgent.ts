// lib/ai/agents/landingPageAgent.ts
import "server-only";

import { landingPreviewSchema } from "@/types/conversational/campaign";
import { getLandingClient } from "../providers/deepseek";

export interface LandingPageInput {
  campaignType: string;
  semanticContent: {
    intent: string;
    summary: string;
    tone: string;
  };
  customPrompt: string;
  imagesUrl?: string[];
}

export type LandingPageOutput = Record<string, unknown>;

// Convert Zod schema to a JSON schema string for the prompt
const schemaJson = JSON.stringify(landingPreviewSchema, null, 2);

export async function generateLandingPreview(
  input: LandingPageInput,
): Promise<LandingPageOutput> {
  const { semanticContent, customPrompt, imagesUrl } = input;

  const imagesSection =
    imagesUrl && imagesUrl.length > 0
      ? imagesUrl.map((url, i) => `${i + 1}. ${url}`).join("\n")
      : "Nema slika";

  const systemPrompt = `Ti si senior landing page strategist.
Tvoj zadatak je da generišeš sadržaj za landing stranicu isključivo u JSON formatu.
Pravila:
1. Ako u 'IMAGES_URL' dobiješ listu URL-ova (imagesUrl), MORAŠ ih mapirati tačno tim redosledom u 'heroVisual.imagesUrl' polje. Ako "Nema slika" onda samo 'hero' sekciju.
2. 'contentSplit' sekcija mora biti fokusirana na jedan specifičan trend.
3. Bez emoji-ja i HTML tagova.
4. Dužina teksta treba da bude adekvatna za premium landing page (od 600 do 1000 reči).

Očekivana struktura JSON objekta (prema Zod šemi):
${schemaJson}

Generiši samo JSON objekat, bez dodatnog teksta.`;

  const userPrompt = `
KORISNIČKI ZAHTEV: ${customPrompt}
IMAGES_URL: ${imagesSection}
SEMANTIČKI KONTEKST:
Svrha: ${semanticContent.intent}
Opis: ${semanticContent.summary}
Ton: ${semanticContent.tone}
`;

  const client = getLandingClient();

  const completion = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content returned from DeepSeek");
  }

  try {
    return JSON.parse(content) as LandingPageOutput;
  } catch (error) {
    console.error("Failed to parse DeepSeek response:", content);
    throw new Error(`Invalid JSON from DeepSeek: ${error}`);
  }
}
