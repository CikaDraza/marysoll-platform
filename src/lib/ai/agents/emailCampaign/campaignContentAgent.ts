import {
  EmailCampaignContent,
  EmailCampaignStrategy,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";
import { callDeepSeek, DeepSeekMessage } from "../../agents";

const SYSTEM_PROMPT = `
Ti si copywriter za beauty email kampanje.

Generiši sadržaj emaila na osnovu strategije.

Odgovori samo JSON objektom:
{
"title": "",
"subtitle": "",
"body": "",
"tips": [],
"ctaText": ""
}
`;

export async function generateCampaignContent(
  input: EmailCampaignStrategy,
): Promise<EmailCampaignContent> {
  const messages: DeepSeekMessage[] = [
    {
      role: "user",
      content: `Strategija kampanje:
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
