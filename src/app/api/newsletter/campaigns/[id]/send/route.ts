// src/app/api/newsletter/campaigns/[id]/send/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { sendCampaignEmails } from "@/lib/newsletterService";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";

interface SendRequestBody {
  action: "send" | "pause" | "resume" | "stop";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult: AdminAuthResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response;
  }

  const { decoded } = authResult;
  const tenantId = decoded.tenantId;

  const denied = await requireFeature(tenantId, "newsletterCampaigns");
  if (denied) return denied;
  const body: SendRequestBody = await request.json();
  const { id } = await context.params;
  const { action } = body;

  try {
    await connectToDB();

    if (!action || !["send", "pause", "resume", "stop"].includes(action)) {
      return NextResponse.json(
        { error: "Nevažeća akcija. Dozvoljeno: send, pause, resume, stop" },
        { status: 400 },
      );
    }

    const campaign = await NewsletterCampaign.findOne({ _id: id, tenantId });
    if (!campaign) {
      return NextResponse.json(
        { error: "Kampanja nije pronađena" },
        { status: 404 },
      );
    }

    switch (action) {
      case "send": {
        if (!["draft", "scheduled", "paused"].includes(campaign.status)) {
          return NextResponse.json(
            {
              error: `Kampanja sa statusom "${campaign.status}" ne može biti pokrenuta`,
            },
            { status: 400 },
          );
        }

        const now = new Date();

        // Proveri da li je zakazano za budućnost
        if (campaign.scheduledFor && new Date(campaign.scheduledFor) > now) {
          // Postavi na scheduled - Vercel Cron će pokrenuti u pravo vreme
          campaign.status = "scheduled";
          await campaign.save();

          return NextResponse.json({
            message: `Kampanja zakazana za ${campaign.scheduledFor.toLocaleString()}`,
            campaign,
          });
        }

        // Ako nema scheduledFor ili je prošlo vreme - pokreni odmah
        campaign.status = "sending";
        campaign.sentAt = now;
        await campaign.save();

        // Pokreni slanje (fire-and-forget)
        sendCampaignEmails(campaign._id.toString())
          .then((result) => {
            console.log(
              `Kampanja ${campaign._id} završena: poslato ${result?.sentCount ?? 0}, nije poslato ${result?.bounceCount ?? 0}`,
            );
          })
          .catch((err) => {
            console.error(`Greška pri slanju kampanje ${campaign._id}:`, err);
            NewsletterCampaign.findByIdAndUpdate(campaign._id, {
              status: "failed",
            }).catch(console.error);
          });

        return NextResponse.json({
          message: "Kampanja pokrenuta – slanje je u toku...",
          campaign,
        });
      }

      case "pause":
        if (campaign.status !== "sending") {
          return NextResponse.json(
            { error: "Samo kampanja u toku slanja može biti pauzirana" },
            { status: 400 },
          );
        }
        campaign.status = "paused";
        break;

      case "resume":
        if (campaign.status !== "paused") {
          return NextResponse.json(
            { error: "Samo pauzirana kampanja može biti nastavljena" },
            { status: 400 },
          );
        }
        campaign.status = "sending";

        // Nastavi slanje
        sendCampaignEmails(campaign._id.toString()).catch((err) => {
          console.error("Resume send error:", err);
          campaign.status = "failed";
          campaign.save();
        });
        break;

      case "stop":
        if (!["sending", "paused", "scheduled"].includes(campaign.status)) {
          return NextResponse.json(
            {
              error:
                "Samo aktivna, pauzirana ili zakazana kampanja može biti zaustavljena",
            },
            { status: 400 },
          );
        }
        campaign.status = "stopped";
        break;
    }

    await campaign.save();

    const actionMessages: Record<string, string> = {
      send: "pokrenuta",
      pause: "pauzirana",
      resume: "nastavljena",
      stop: "zaustavljena",
    };

    return NextResponse.json({
      message: `Kampanja uspešno ${actionMessages[action]}`,
      campaign,
    });
  } catch (error) {
    console.error(`Campaign ${action} error:`, error);
    return NextResponse.json(
      { error: "Greška prilikom obrade kampanje" },
      { status: 500 },
    );
  }
}
