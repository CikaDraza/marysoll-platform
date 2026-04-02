import {
  EmailCampaignContent,
  EmailCampaignOptimization,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";
import { callDeepSeek, DeepSeekMessage } from "../../agents";

const SYSTEM_PROMPT = `
Ti si AI optimizer za email kampanje.

Analiziraj performanse prethodnih kampanja
i predloži poboljšanja.

Vrati JSON:

{
"insights": [],
"subjectLineSuggestions": [],
"sendTimeSuggestion": ""
}
`;

export async function generateCampaignOptimization(
  input: EmailCampaignContent,
): Promise<EmailCampaignOptimization> {
  const messages: DeepSeekMessage[] = [
    {
      role: "user",
      content: `Email kampanja:
${JSON.stringify(input, null, 2)}`,
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
