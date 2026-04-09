// src/lib/imageGeneration/imageGenerationLib.ts
import OpenAI from "openai";

const API_KEY = process.env.API_KEY_OPEN_IMAGE_GEN;

if (!API_KEY) {
  throw new Error("API_KEY_OPEN_IMAGE_GEN environment variable not set");
}

const openai = new OpenAI({ apiKey: API_KEY });

export async function generateImageLib(prompt: string): Promise<string> {
  const enhancedPrompt = `
Luxury beauty salon marketing photo. Makeup, hair styling, massage, and skincare products artfully arranged on a vanity table.

Scene: ${prompt}

Style:
- high-end beauty photography
- studio lighting
- elegant skin tones
- professional cosmetics branding
- magazine quality
`;

  const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt: enhancedPrompt,
    size: "1024x1024",
  });

  const base64 = result.data?.[0]?.b64_json;

  if (!base64) {
    throw new Error("OpenAI did not return an image.");
  }

  return `data:image/png;base64,${base64}`;
}
