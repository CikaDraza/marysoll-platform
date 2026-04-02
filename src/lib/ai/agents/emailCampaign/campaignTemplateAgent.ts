import {
  EmailCampaignContent,
  EmailCampaignTemplate,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";
import { callDeepSeek, DeepSeekMessage } from "../../agents";

const SYSTEM_PROMPT = `
Ti si ekspert za HTML email templejte.

Pravila:

- koristi TABLE layout
- inline CSS
- maksimalna širina 600px
- kompatibilno sa Gmail, Outlook, Apple Mail

Vrati JSON:

{
"html": "<table>...</table>"
}
`;

export async function generateCampaignTemplate(
  input: EmailCampaignContent,
): Promise<EmailCampaignTemplate> {
  const messages: DeepSeekMessage[] = [
    {
      role: "user",
      content: `Sadržaj emaila:
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
