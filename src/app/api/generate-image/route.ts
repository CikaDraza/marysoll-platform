import { NextResponse, type NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { headers } from "next/headers";
import OpenAI from "openai";
import { rateLimit } from "@/lib/imageGeneration/rateLimit";

const openai = new OpenAI({
  apiKey: process.env.API_KEY_OPEN_IMAGE_GEN,
});

export async function POST(req: Request) {
  try {
    // ── Autorizacija ──────────────────────────────────────────────────────
    // Ruta je bila potpuno otvorena: bez tokena, bez tenanta, bez plan gate-a,
    // a troši OpenAI API. Renderovala se i na JAVNOJ landing strani, pa je
    // bilo ko mogao da generiše slike o trošku platforme.
    //
    // Jedini legitimni potrošač je admin CMS. Plan se čita SA SERVERA — ne
    // veruje se browser feature flag-u.
    const token = getTokenFromRequest(req as NextRequest);
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!decoded.isSuperAdmin) {
      if (!decoded.isAdmin || !decoded.tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const denied = await requireFeature(decoded.tenantId, "aiImageGeneration");
      if (denied) return denied;
    }

    const ip = (await headers()).get("x-forwarded-for") || "unknown";

    const rl = rateLimit(ip);

    if (!rl.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const { prompt } = await req.json();

    if (!prompt || prompt.trim() === "") {
      return NextResponse.json(
        { error: "Prompt cannot be empty." },
        { status: 400 },
      );
    }

    const enhancedPrompt = `
Luxury beauty salon marketing image.

Style:
- elegant lighting
- beauty salon aesthetic
- modern professional photography
- makeup, nails, spa or wellness theme

User idea:
${prompt}
`;

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: enhancedPrompt,
      size: "1024x1024",
    });

    const base64 = response.data?.[0]?.b64_json;

    if (!base64) {
      throw new Error("No base64 image returned from OpenAI.");
    }

    return NextResponse.json({
      image: `data:image/png;base64,${base64}`,
    });
  } catch (error) {
    console.error("Image generation error:", error);

    return NextResponse.json(
      { error: "Image generation failed." },
      { status: 500 },
    );
  }
}
