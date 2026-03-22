import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY_TEMPLATE;

// Koristimo standardnu biblioteku koja je najstabilnija za tekst
const genAI = new GoogleGenerativeAI(API_KEY || "");

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt je obavezan" },
        { status: 400 },
      );
    }

    // KORISTIMO 2.0 FLASH jer tvoj curl kaže da taj model tvoj ključ vidi
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const fullPrompt = `Ti si profesionalni email dizajner. 
    Kreiraj čist, responsivan HTML email templejt (samo <body> deo, inline CSS) za: "${prompt}".
    Boje: #BA34B7 i #5D0156.
    VRATI SAMO ČIST HTML KOD BEZ MARKDOWN OZNAKA (\`\`\`html).`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    let htmlContent = response.text().trim();

    // Čišćenje ako AI ipak ubaci markdown
    htmlContent = htmlContent
      .replace(/^```html\n?/, "")
      .replace(/```$/, "")
      .trim();

    return NextResponse.json({ htmlContent }); // Vraćamo objekat sa ključem htmlContent
  } catch (error: unknown) {
    console.error("Gemini Error:", error);
    return NextResponse.json(
      {
        error:
          (error instanceof Error && error.message) || "Greška pri generisanju",
      },
      { status: 500 },
    );
  }
}
