// src/app/api/newsletter/campaigns/generate-images/route.ts
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { uploadBase64ToCloudinary, getTenantFolder } from "@/lib/cloudinary";
import { generateImage } from "@/lib/ai/orchestrator";

const SUPERADMIN_IMAGE_FOLDER = "superadmin/images";

export async function POST(req: Request) {
  try {
    // 1. Admin authentication
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) {
      return authResult.response;
    }

    // 2. Plan feature gate — AI image generation is Pro+
    if (!authResult.decoded.isSuperAdmin) {
      const denied = await requireFeature(
        authResult.decoded.tenantId,
        "aiImageGeneration",
      );
      if (denied) return denied;
    }

    // 3. Parse request
    const { prompt } = await req.json();
    if (!prompt || prompt.trim() === "") {
      return NextResponse.json(
        { error: "Prompt cannot be empty." },
        { status: 400 },
      );
    }

    const { base64Image } = await generateImage(prompt);

    // 5. Upload to Cloudinary in tenant folder
    const folder = authResult.decoded.isSuperAdmin
      ? SUPERADMIN_IMAGE_FOLDER
      : await getTenantFolder(authResult.decoded.tenantId);
    const url = await uploadBase64ToCloudinary(base64Image, folder);

    // 6. Return the secure URL
    return NextResponse.json({
      url,
    });
  } catch (error: unknown) {
    console.error("Newsletter image generation error:", error);
    return NextResponse.json(
      { error: "Image generation failed." },
      { status: 500 },
    );
  }
}
