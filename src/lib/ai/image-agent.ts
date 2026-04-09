// src/services/imageAgent.ts
import { generateImageLib } from "../imageGeneration/imageGenerationLib";
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
 * Korak 1: Generiši optimizovan prompt koristeći DeepSeek
 */
export async function generateImagePrompt(
  userDescription: string,
): Promise<string> {
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
 * Kompletna pipeline: opis korisnika → DeepSeek prompt → OpenAI slika → base64
 */
export async function generateImage(userDescription: string): Promise<string> {
  const optimizedPrompt = await generateImagePrompt(userDescription);
  return generateImageLib(optimizedPrompt);
}
