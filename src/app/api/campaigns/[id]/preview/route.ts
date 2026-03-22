// POST /api/campaigns/[id]/preview
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { landingPreviewSchema } from "@/types/conversational/campaign";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const campaign = await NewsletterCampaign.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: "Kampanja nije pronađena" },
        { status: 404 },
      );
    }

    const { campaignType, semanticContent, customPrompt, imagesUrl } =
      await req.json();

    // Guard: nema landing preview za email-only
    if (campaignType !== "email-landing") {
      return NextResponse.json({ landing: null });
    }

    const { intent, summary, tone } = semanticContent;

    if (!intent || !summary || !tone) {
      return NextResponse.json(
        { error: "Missing semantic data" },
        { status: 400 },
      );
    }

    const imagesSection =
      imagesUrl && imagesUrl.length > 0
        ? imagesUrl
            .map((url: string, i: number) => `${i + 1}. ${url}`)
            .join("\n")
        : "Nema slika";

    // Inicijalizacija modela sa sistemskom instrukcijom
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `Ti si senior landing page strategist. 
      Tvoj zadatak je da generišeš sadržaj za landing stranicu isključivo u JSON formatu.
      Pravila:
      1. Ako u 'IMAGES_URL' dobiješ listu URL-ova (imagesUrl), MORAŠ ih mapirati tačno tim redosledom u 'heroVisual.imagesUrl' polje. Ako "Nema slika" onda samo 'hero' sekciju.
      2. 'contentSplit' sekcija mora biti fokusirana na jedan specifičan trend.
      3. Bez emoji-ja i HTML tagova.
      4. Dužina teksta treba da bude adekvatna za premium landing page (od 600 do 1000 reči).`,
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
          KORISNIČKI ZAHTEV: ${customPrompt}
          IMAGES_URL: ${imagesSection}
          SEMANTIČKI KONTEKST:
          Svrha: ${semanticContent.intent}
          Opis: ${semanticContent.summary}
          Ton: ${semanticContent.tone}
        `,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: landingPreviewSchema,
        temperature: 0.1,
      },
    });

    const landing = JSON.parse(result.response.text());
    return NextResponse.json({ landing });
  } catch (error: unknown) {
    console.error("Campaign preview AI error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Preview generation failed",
      },
      { status: 500 },
    );
  }
}
