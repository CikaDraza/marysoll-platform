// app/api/newsletter/campaigns/create/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";

export async function POST(request: Request) {
  try {
    await connectToDB();

    const authResult: AdminAuthResult = await requireAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const tenantId = authResult.decoded.tenantId;

    const denied = await requireFeature(tenantId, "newsletterCampaigns");
    if (denied) return denied;

    const body = await request.json();
    const {
      name,
      templateId = null, // može biti null ili string
      defaultTemplateSlug = null,
      ctaSlug,
      subject,
      previewText = "",
      content,
      manualRecipients,
      sendToAll = true,
      excludeRecentSubscribers = false,
      excludeInactive = false,
      scheduledFor,
    } = body;

    // Osnovna validacija
    if (!name?.trim())
      return NextResponse.json(
        { error: "Naziv kampanje je obavezan" },
        { status: 400 },
      );
    if (!subject?.trim())
      return NextResponse.json(
        { error: "Subject je obavezan" },
        { status: 400 },
      );
    if (!content?.trim())
      return NextResponse.json(
        { error: "Content je obavezan" },
        { status: 400 },
      );

    // Ako je default templejt – proveri da li slug postoji u default listi (opcionalno)
    if (
      defaultTemplateSlug &&
      ![
        "default-promotions",
        "default-news",
        "default-tips",
        "default-events",
      ].includes(defaultTemplateSlug)
    ) {
      return NextResponse.json(
        { error: "Nepoznat default templejt slug" },
        { status: 400 },
      );
    }

    const campaign = new NewsletterCampaign({
      tenantId,
      name: name.trim(),
      templateId: templateId || null,
      defaultTemplateSlug: defaultTemplateSlug,
      ctaSlug: ctaSlug || null,
      subject: subject.trim(),
      previewText: previewText.trim(),
      content,
      manualRecipients,
      sendToAll,
      excludeRecentSubscribers,
      excludeInactive,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      status: scheduledFor ? "scheduled" : "draft",
      sentCount: 0,
      openCount: 0,
      clickCount: 0,
    });

    await campaign.save();

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: unknown) {
    console.error("Create campaign error:", error);
    return NextResponse.json(
      {
        error: (error as Error).message || "Greška prilikom kreiranja kampanje",
      },
      { status: 500 },
    );
  }
}
