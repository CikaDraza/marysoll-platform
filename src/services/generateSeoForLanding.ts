import { Input, seoSchema } from "@/types/conversational/ai.seo";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateSeoForLanding(input: Input) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });

  const prompt = `
  Task: Generate high-quality SEO metadata in Serbian (Latin script).
    Generate SEO metadata for a landing page based on the following:
    
    SEED TITLE: ${input.titleSeed || "None"}
    KEYWORDS: ${input.keywords?.join(", ") || "None"}
    PAGE CONTENT: 
    ${input.content}

    RULES:
    1. Title: Max 60 chars.
    2. Description: Max 160 chars.
    3. Ensure keywords are relevant to the content.
    4. OG tags should be catchy for social media.
  `;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: seoSchema,
      temperature: 0.3,
    },
  });
  const responseText = result.response.text();

  try {
    return JSON.parse(responseText);
  } catch (e) {
    console.error("JSON Parse error:", responseText);
    throw new Error(`Model generated invalid JSON - ${e}`);
  }
}
