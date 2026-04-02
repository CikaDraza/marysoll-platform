import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { generateEmailTemplate } from "@/lib/ai/orchestrator";

export async function POST(request: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(request);
    if (!authResult.success) return authResult.response;

    const denied = await requireFeature(
      authResult.decoded.tenantId,
      "aiEmailTemplates",
    );
    if (denied) return denied;

    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt je obavezan" },
        { status: 400 },
      );
    }

    const htmlContent = await generateEmailTemplate(prompt);

    return NextResponse.json({ htmlContent });
  } catch (error: unknown) {
    console.error("Email template generation error:", error);
    return NextResponse.json(
      {
        error:
          (error instanceof Error && error.message) || "Greška pri generisanju",
      },
      { status: 500 },
    );
  }
}
