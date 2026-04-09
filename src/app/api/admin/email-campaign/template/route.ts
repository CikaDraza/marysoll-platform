// POST /api/admin/email-campaign/template
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { runAgent } from "@/lib/ai/orchestrator";
import { generateImageLib } from "@/lib/imageGeneration/imageGenerationLib";
import { uploadBase64ToCloudinary, getTenantFolder } from "@/lib/cloudinary";
import type {
  EmailCampaignContent,
  EmailCampaignTemplateBlock,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";

const IMAGE_PLACEHOLDER = "{{EMAIL_IMAGE_URL}}";

export async function POST(req: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;

    const denied = await requireFeature(tenantId, "unlimitedAiTokens");
    if (denied) return denied;

    const content = (await req.json()) as EmailCampaignContent;

    if (!content.title && !content.body) {
      return NextResponse.json(
        { error: "Sadržaj kampanje nije kompletan" },
        { status: 400 },
      );
    }

    // Run template generation and image generation in parallel when imagePrompt is present
    const [template, base64Image] = await Promise.all([
      runAgent("campaignTemplate", content),
      content.imagePrompt
        ? generateImageLib(content.imagePrompt)
        : Promise.resolve(null),
    ]);

    // Inject generated image URL into HTML and blocks
    if (base64Image) {
      const folder = await getTenantFolder(tenantId!);
      const uploadResult = await uploadBase64ToCloudinary(base64Image, folder);
      const imageUrl = uploadResult.secure_url;

      template.html = template.html.replaceAll(IMAGE_PLACEHOLDER, imageUrl);

      const imageBlock = template.blocks.find(
        (b: EmailCampaignTemplateBlock) => b.type === "image",
      );
      if (imageBlock) {
        // ImageBlock renders data.src; also keep data.url for consistency
        imageBlock.data.src = imageUrl;
        imageBlock.data.url = imageUrl;
      }

      template.imageUrl = imageUrl;
    }

    return NextResponse.json(template);
  } catch (error: unknown) {
    console.error("[email-campaign/template] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Greška pri generisanju templejta",
      },
      { status: 500 },
    );
  }
}
