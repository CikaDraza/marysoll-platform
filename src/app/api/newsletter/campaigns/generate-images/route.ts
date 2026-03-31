import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { uploadBase64ToCloudinary, getTenantFolder } from "@/lib/cloudinary";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function POST(req: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { prompt } = await req.json();

    if (!prompt || prompt.trim() === "") {
      return NextResponse.json(
        { error: "Prompt cannot be empty." },
        { status: 400 },
      );
    }

    const response = await ai.models.generateImages({
      model: "imagen-4.0-generate-001",
      prompt: `Create a visually stunning, high-fashion image for a makeup, nails, beauty and care products: "${prompt}".`,
      config: {
        numberOfImages: 1,
        outputMimeType: "image/jpeg",
        aspectRatio: "1:1",
      },
    });

    const base64Image = response.generatedImages?.[0]?.image?.imageBytes ?? "";

    if (!base64Image) {
      throw new Error("No image data returned from Gemini API.");
    }

    const folder = await getTenantFolder(authResult.decoded.tenantId);
    const uploadResponse = await uploadBase64ToCloudinary(base64Image, folder);

    return NextResponse.json({
      url: uploadResponse.secure_url,
    });
  } catch (error: unknown) {
    console.error("Gemini image generation error:", error);
    return NextResponse.json(
      { error: "Image generation failed." },
      { status: 500 },
    );
  }
}
