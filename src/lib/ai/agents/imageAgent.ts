/**
 * lib/ai/agents/imageAgent.ts
 *
 * Full image generation pipeline:
 *   1. DeepSeek optimizes the user's prompt
 *   2. DALL-E 3 renders the image
 *   3. Returns base64 data URL
 *
 * Replaces lib/imageGeneration/deepseekPrompt.ts (prompt step)
 * while keeping lib/imageGeneration/dalle.ts for the render step.
 */
import "server-only";

import { callDeepSeek, DeepSeekMessage } from "../agents";
import { generateImageWithDalle } from "@/lib/imageGeneration/dalle";

const IMAGE_SYSTEM_PROMPT = `
Ti si ekspert za kreiranje prompta za generisanje slika za beauty salone.
Daj SAMO jedan optimizovan engleski prompt za image generation AI.
Bez objašnjenja, bez markdown — samo prompt tekst.

Stil: Profesionalne beauty fotografije, visoka rezolucija, elegantno.
Izbegavaj: lica, ljude prepoznatljive, tekst u slici, logos.
`;

/** Step 1 — optimize user description into a DALL-E-ready prompt. */
async function optimizePrompt(userDescription: string): Promise<string> {
  try {
    const messages: DeepSeekMessage[] = [
      {
        role: "user",
        content: `Kreiraj image generation prompt za: ${userDescription}`,
      },
    ];

    const response = await callDeepSeek({
      agent: "image",
      messages,
      systemPrompt: IMAGE_SYSTEM_PROMPT,
    });

    if (!response.ok) {
      console.warn(
        `[imageAgent] DeepSeek prompt optimisation returned ${response.status}, using original`,
      );
      return userDescription;
    }

    const text = await response.text();
    let data: { choices?: { message?: { content?: string } }[] };
    try {
      data = JSON.parse(text);
    } catch {
      console.warn(
        "[imageAgent] DeepSeek response is not JSON, using original prompt:",
        text.slice(0, 200),
      );
      return userDescription;
    }

    return data.choices?.[0]?.message?.content?.trim() || userDescription;
  } catch (err) {
    console.warn(
      "[imageAgent] Prompt optimisation failed, using original prompt:",
      err,
    );
    return userDescription;
  }
}

/**
 * Full pipeline: user description → optimized DALL-E prompt → base64 data URL.
 * Returns { optimizedPrompt, base64Image }.
 */
export async function generateImage(userDescription: string): Promise<{
  optimizedPrompt: string;
  base64Image: string;
}> {
  const optimizedPrompt = await optimizePrompt(userDescription);
  const base64Image = await generateImageWithDalle(optimizedPrompt);
  return { optimizedPrompt, base64Image };
}
