// src/app/api/newsletter/campaigns/generate-images/route.ts
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { uploadBase64ToCloudinary, getTenantFolder } from "@/lib/cloudinary";
import { generateImage } from "@/lib/ai/orchestrator";
import { resolveNewsletterAdminScope } from "@/lib/newsletter/adminTenantScope";

const SUPERADMIN_IMAGE_FOLDER = "superadmin/images";

export async function POST(req: Request) {
  try {
    // 1. Admin authentication
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const newsletterScope = await resolveNewsletterAdminScope(
      req,
      authResult.decoded,
    );
    if (!newsletterScope) {
      return NextResponse.json(
        {
          error:
            "Nije moguće odrediti nalog za newsletter. Osvežite stranicu i pokušajte ponovo.",
          code: "NEWSLETTER_SCOPE_INVALID",
        },
        { status: 403 },
      );
    }

    // 2. Plan feature gate — AI image generation is Kiki+
    if (newsletterScope.scope === "tenant") {
      const denied = await requireFeature(
        newsletterScope.tenantId,
        "aiImageGeneration",
      );
      if (denied) return denied;
    }

    // 3. Parse request
    const { prompt } = await req.json();
    if (!prompt || prompt.trim() === "") {
      return NextResponse.json(
        {
          error: "Unesite opis slike koju želite da generišete.",
          code: "IMAGE_PROMPT_REQUIRED",
        },
        { status: 400 },
      );
    }

    const { base64Image } = await generateImage(prompt);

    // 5. Upload to Cloudinary in tenant folder
    const folder = newsletterScope.scope === "platform"
      ? SUPERADMIN_IMAGE_FOLDER
      : await getTenantFolder(newsletterScope.tenantId);
    const url = await uploadBase64ToCloudinary(base64Image, folder);

    // 6. Return the secure URL
    return NextResponse.json({
      url,
    });
  } catch (error: unknown) {
    console.error("Newsletter image generation error:", error);
    return NextResponse.json(
      {
        error:
          "Generisanje slike trenutno nije dostupno. Pokušajte ponovo za nekoliko minuta.",
        code: "IMAGE_GENERATION_UNAVAILABLE",
      },
      { status: 500 },
    );
  }
}
