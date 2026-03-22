/**
 * Image Agent
 *
 * Step 1: DeepSeek (DEEPSEEK_API_KEY_IMAGE) generates an optimized image prompt
 * Step 2: Google Gemini Imagen renders the actual image
 *
 * DeepSeek cannot generate images directly — it generates the prompt.
 * Gemini handles the actual image generation (same as existing client-growth implementation).
 */

import { callDeepSeek } from "./agents";
import type { DeepSeekMessage } from "./agents";

const PROMPT_SYSTEM = `
Ti si ekspert za kreiranje prompta za generisanje slika za beauty salone.
Daj SAMO jedan optimizovan engleski prompt za image generation AI.
Bez objašnjenja, bez markdown — samo prompt tekst.

Stil: Profesionalne beauty fotografije, visoka rezolucija, elegantno.
Izbegavaj: lica, ljude prepoznatljive, tekst u slici, logos.
`;

/**
 * Step 1: Generate an optimized image prompt using DeepSeek
 */
export async function generateImagePrompt(userDescription: string): Promise<string> {
  const messages: DeepSeekMessage[] = [
    {
      role: "user",
      content: `Kreiraj image generation prompt za: ${userDescription}`,
    },
  ];

  const response = await callDeepSeek({
    agent: "image",
    messages,
    systemPrompt: PROMPT_SYSTEM,
  });

  if (!response.ok) {
    throw new Error(`Image prompt agent error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? userDescription;
}

/**
 * Step 2: Render image using Google Gemini Imagen
 * (Unchanged from client-growth implementation)
 */
export async function generateImageWithGemini(prompt: string): Promise<string> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const response = await ai.models.generateImages({
    model: "imagen-3.0-generate-002",
    prompt,
    config: { numberOfImages: 1, outputMimeType: "image/jpeg" },
  });

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) throw new Error("No image generated");

  return `data:image/jpeg;base64,${imageBytes}`;
}

/**
 * Full pipeline: description → DeepSeek prompt → Gemini image → base64
 */
export async function generateImage(userDescription: string): Promise<string> {
  const optimizedPrompt = await generateImagePrompt(userDescription);
  return generateImageWithGemini(optimizedPrompt);
}
