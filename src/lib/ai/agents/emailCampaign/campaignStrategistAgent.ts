import {
  EmailCampaignInput,
  EmailCampaignStrategy,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";
import { callDeepSeek, DeepSeekMessage } from "../../agents";

export interface EmailCampaignStrategistInput extends EmailCampaignInput {
  analyticsSummary?: string;
  salonName: string;
}

const SYSTEM_PROMPT = `
Ti si senior email marketing strategist za beauty salone.

Generiši strategiju email kampanje i odgovori ISKLJUČIVO validnim JSON objektom bez ikakvog teksta pre ili posle.

JSON mora imati TAČNO ovu strukturu (sva polja su obavezna):
{
  "campaignGoal": "string — cilj kampanje",
  "suggestedSubjectLines": ["string", "string", "string"],
  "previewTexts": ["string", "string", "string"],
  "targetAudience": "string — opis ciljne publike",
  "recommendedSendTime": "string — npr. Utorak, 10:00–11:00",
  "reasoning": "string — kratko obrazloženje strategije"
}

Pravila:
- suggestedSubjectLines mora biti niz sa tačno 3 string elementa
- previewTexts mora biti niz sa tačno 3 string elementa
- Sva ostala polja su stringovi
- NE dodavaj nikakve komentare, markdown, ni tekst van JSON-a
`;

export async function generateCampaignStrategy(
  input: EmailCampaignStrategistInput,
): Promise<EmailCampaignStrategy> {
  const messages: DeepSeekMessage[] = [
    {
      role: "user",
      content: `
Salon: ${input.salonName}
Tema: ${input.topic}
Publika: ${input.audience ?? "opšta publika salona"}
Ton: ${input.tone ?? "friendly"}
Analitika prethodnih kampanja:
${input.analyticsSummary ?? "Nema podataka"}

Kreiraj strategiju email kampanje. Odgovori SAMO JSON objektom.
`,
    },
  ];

  const response = await callDeepSeek({
    agent: "landing",
    messages,
    systemPrompt: SYSTEM_PROMPT,
    jsonMode: true,
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }

  // Normalize — ensure all required fields exist regardless of AI output variance
  return {
    campaignGoal:
      typeof parsed.campaignGoal === "string" ? parsed.campaignGoal : "",
    suggestedSubjectLines: Array.isArray(parsed.suggestedSubjectLines)
      ? (parsed.suggestedSubjectLines as string[]).filter(
          (s) => typeof s === "string",
        )
      : [],
    previewTexts: Array.isArray(parsed.previewTexts)
      ? (parsed.previewTexts as string[]).filter((s) => typeof s === "string")
      : [],
    targetAudience:
      typeof parsed.targetAudience === "string" ? parsed.targetAudience : "",
    recommendedSendTime:
      typeof parsed.recommendedSendTime === "string"
        ? parsed.recommendedSendTime
        : "",
    reasoning:
      typeof parsed.reasoning === "string" ? parsed.reasoning : undefined,
  };
}
