import {
  EmailCampaignInput,
  EmailCampaignStrategy,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";
import { callDeepSeek, DeepSeekMessage } from "../../agents";

export interface EmailCampaignStrategistInput extends EmailCampaignInput {
  analyticsSummary?: string; // npr. "Open rate: 45%, Click rate: 12%, Top topics: ... "
}

const SYSTEM_PROMPT = `
Ti si senior email marketing strategist za beauty salone.

Generiši strategiju email kampanje.

Odgovaraj ISKLJUČIVO validnim JSON objektom.
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
Publika: ${input.audience}
Ton: ${input.tone ?? "friendly"}
Analitika prethodnih kampanja:
${input.analyticsSummary ?? "Nema podataka"}

Kreiraj strategiju email kampanje.
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

  return JSON.parse(content);
}
