// app/api/newsletter/campaigns/create/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { resolveNewsletterAdminScope } from "@/lib/newsletter/adminTenantScope";
import { normalizePlatformAudienceFilter } from "@/lib/newsletter/audienceFilter";
import { platformOrigin } from "@/lib/platform/host-context";

export async function POST(request: Request) {
  try {
    await connectToDB();

    const authResult: AdminAuthResult = await requireAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const newsletterScope = await resolveNewsletterAdminScope(
      request,
      authResult.decoded,
    );
    if (!newsletterScope) {
      return NextResponse.json(
        { error: "Newsletter scope nije validan" },
        { status: 403 },
      );
    }

    if (newsletterScope.scope === "tenant") {
      const denied = await requireFeature(
        newsletterScope.tenantId,
        "newsletterCampaigns",
      );
      if (denied) return denied;
    }

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
      audienceFilter = "all",
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
      scope: newsletterScope.scope,
      tenantId:
        newsletterScope.scope === "tenant" ? newsletterScope.tenantId : undefined,
      platformOwnerId:
        newsletterScope.scope === "platform"
          ? newsletterScope.platformOwnerId
          : undefined,
      name: name.trim(),
      templateId: templateId || null,
      defaultTemplateSlug: defaultTemplateSlug,
      ctaSlug:
        ctaSlug ||
        (newsletterScope.scope === "platform" ? `${platformOrigin(request)}/` : null),
      subject: subject.trim(),
      previewText: previewText.trim(),
      content,
      manualRecipients,
      sendToAll,
      audienceFilter: normalizePlatformAudienceFilter(audienceFilter),
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
