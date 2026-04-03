// POST /api/campaigns/draft — create or update campaign draft
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";
import { SalonProfile } from "@/models/SalonProfile";
import type {
  EmailCampaignContent,
  EmailCampaignOptimization,
  EmailCampaignStrategy,
  EmailCampaignTemplate,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";

interface DraftBody {
  campaignId?: string;
  salonProfileId: string;
  salonName?: string;
  topic: string;
  audience?: string;
  tone: string;
  strategy?: EmailCampaignStrategy;
  content?: EmailCampaignContent;
  template?: EmailCampaignTemplate;
  optimization?: EmailCampaignOptimization;
}

export async function POST(req: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;

    const denied = await requireFeature(tenantId, "unlimitedAiTokens");
    if (denied) return denied;

    await connectToDB();

    const body = (await req.json()) as DraftBody;

    const {
      campaignId,
      salonProfileId,
      salonName,
      topic,
      audience,
      tone,
      strategy,
      content,
      template,
      optimization,
    } = body;

    if (!salonProfileId || !topic || !tone) {
      return NextResponse.json(
        { error: "salonProfileId, topic i tone su obavezni" },
        { status: 400 },
      );
    }

    // Resolve salonName — look it up when the client didn't send it
    let resolvedSalonName = salonName?.trim() ?? "";
    if (!resolvedSalonName) {
      const salon = await SalonProfile.findById(salonProfileId)
        .select("name")
        .lean<{ name: string }>();
      resolvedSalonName = salon?.name ?? "";
    }

    if (!resolvedSalonName) {
      return NextResponse.json(
        { error: "Salon nije pronađen" },
        { status: 404 },
      );
    }

    // Build update payload from AI pipeline data
    const updatePayload: Record<string, unknown> = {
      tenantId,
      salonProfileId,
      salonName: resolvedSalonName,
      topic,
      audience: audience ?? "",
      tone,
      "scheduling.status": "draft",
    };

    if (strategy) {
      updatePayload["strategy.keyAngle"] = strategy.campaignGoal ?? "";
      updatePayload["strategy.promotionIdea"] = strategy.reasoning ?? "";
    }

    if (content) {
      updatePayload["content.subject"] = content.subject;
      updatePayload["content.previewText"] = content.previewText;
      updatePayload["content.heroTitle"] = content.title;
      updatePayload["content.heroText"] = content.body;
      updatePayload["content.offerTitle"] = content.subtitle ?? "";
      updatePayload["content.offerText"] = (content.bullets ?? []).join("\n");
      updatePayload["content.ctaText"] = content.ctaText;
    }

    if (template) {
      updatePayload["template.html"] = template.html;
    }

    if (optimization) {
      updatePayload["optimization.predictedOpenRate"] =
        optimization.expectedOpenRate;
      updatePayload["optimization.predictedClickRate"] =
        optimization.expectedClickRate;
      updatePayload["optimization.optimizedSubject"] =
        optimization.improvedSubject;
      updatePayload["optimization.optimizedPreview"] =
        optimization.improvedPreview;
      updatePayload["optimization.aiSuggestions"] = optimization.suggestions;
      updatePayload["optimization.confidenceScore"] =
        optimization.confidenceScore ?? 0;
    }

    let campaign;

    if (campaignId) {
      campaign = await EmailCampaign.findOneAndUpdate(
        { _id: campaignId, tenantId },
        { $set: updatePayload },
        { new: true },
      );

      if (!campaign) {
        return NextResponse.json(
          { error: "Kampanja nije pronađena" },
          { status: 404 },
        );
      }
    } else {
      campaign = await EmailCampaign.create({
        ...updatePayload,
        "scheduling.status": "draft",
      });
    }

    return NextResponse.json({
      campaignId: campaign._id.toString(),
      status: "draft",
    });
  } catch (error: unknown) {
    console.error("[campaigns/draft] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Greška pri čuvanju nacrta kampanje",
      },
      { status: 500 },
    );
  }
}
