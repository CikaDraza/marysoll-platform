import { CampaignLandingContent } from "@/types/conversational/campaign";

interface PreviewPayload {
  campaignType: "email-only" | "email-landing";
  semanticContent: {
    intent: string;
    summary: string;
    tone: string;
  };
  customPrompt?: string;
  imagesUrl?: string[];
  signal?: AbortSignal;
}

interface PreviewResponse {
  landing: CampaignLandingContent | null;
}

export async function generateCampaignPreview(
  campaignId: string,
  form: PreviewPayload,
): Promise<CampaignLandingContent | null> {
  const res = await fetch(`/api/campaigns/${campaignId}/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(form),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "AI preview generation failed");
  }

  const data: PreviewResponse = await res.json();
  return data.landing;
}
