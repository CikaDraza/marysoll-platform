// lib/ai/agents/emailTemplateAgent.ts
import "server-only";

import { getTemplateClient } from "../providers/deepseek";

export async function generateEmailTemplate(prompt: string): Promise<string> {
  const systemPrompt = `Ti si profesionalni email dizajner.
Kreiraj čist, responsivan HTML email templejt (samo <body> deo, inline CSS) za dati zahtev.
Layout: Samo body email koji ce biti wrap-ovan u header i footer mejla.
VRATI SAMO ČIST HTML KOD BEZ MARKDOWN OZNAKA (\`\`\`html). Nema dodatnog teksta pre ili posle HTML-a.`;

  const userPrompt = `Kreiraj email templejt za: "${prompt}"`;

  const client = getTemplateClient();

  const completion = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
  });

  let html = completion.choices[0]?.message?.content?.trim() || "";

  // Strip markdown fences if AI ignores the instruction
  html = html
    .replace(/^```html\n?/, "")
    .replace(/```$/, "")
    .trim();

  return html;
}
