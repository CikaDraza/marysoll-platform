import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || prompt.trim() === "") {
      return NextResponse.json(
        { error: "Prompt cannot be empty." },
        { status: 400 },
      );
    }

    const response = await ai.models.generateImages({
      model: "imagen-4.0-generate-001",
      prompt: `Create a visually stunning, high-fashion image for a makeup and nail salon: "${prompt}".`,
      config: {
        numberOfImages: 1,
        outputMimeType: "image/jpeg",
        aspectRatio: "1:1",
      },
    });

    const base64ImageBytes =
      response.generatedImages?.[0]?.image?.imageBytes ?? "";

    if (!base64ImageBytes) {
      throw new Error("No image data returned from Gemini API.");
    }

    return NextResponse.json({
      image: `data:image/jpeg;base64,${base64ImageBytes}`,
    });
  } catch (error: unknown) {
    console.error("Gemini image generation error:", error);
    return NextResponse.json(
      { error: "Image generation failed." },
      { status: 500 },
    );
  }
}
