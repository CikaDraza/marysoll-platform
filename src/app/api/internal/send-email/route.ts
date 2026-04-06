/**
 * POST /api/internal/send-email
 *
 * Called by the Railway worker (long-running poller).
 * Protected by x-internal-api-key header.
 *
 * Body: { campaignId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { executeSend } from "@/lib/campaigns/executeSend";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-internal-api-key");
  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { campaignId } = (await req.json()) as { campaignId?: string };
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
    }

    const result = await executeSend(campaignId);
    return NextResponse.json({ campaignId, ...result });
  } catch (err) {
    console.error("[POST /api/internal/send-email]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
