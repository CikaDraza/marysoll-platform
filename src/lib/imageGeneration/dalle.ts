// src/lib/imageGeneration/dalle.ts
import OpenAI from "openai";

const API_KEY = process.env.API_KEY_IMAGE_GENERATION;
if (!API_KEY) {
  throw new Error("API_KEY_IMAGE_GENERATION environment variable not set");
}

const openai = new OpenAI({ apiKey: API_KEY });

export async function generateImageWithDalle(prompt: string): Promise<string> {
  const enhancedPrompt = `Create a visually stunning, high-fashion image for a makeup, nails, beauty and care products: "${prompt}". The image should be professional, elegant, and suitable for a beauty salon website.`;

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: enhancedPrompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
    response_format: "url",
  });

  if (!response.data) {
    throw new Error("No image data returned from OpenAI.");
  }

  const imageUrl = response.data[0]?.url;
  if (!imageUrl) {
    throw new Error("No image URL returned from OpenAI.");
  }

  // Fetch image and convert to base64
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error("Failed to fetch image from OpenAI");
  }
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64 = Buffer.from(imageBuffer).toString("base64");
  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

  return `data:${contentType};base64,${base64}`;
}
