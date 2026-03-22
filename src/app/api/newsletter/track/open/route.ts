// app/api/newsletter/track/open/route.ts
import { trackOpen } from "@/lib/newsletterService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const campaign = req.nextUrl.searchParams.get("campaign");
  const subscriber = req.nextUrl.searchParams.get("subscriber");

  if (campaign && subscriber) {
    await trackOpen(campaign, subscriber);
  }

  // Vrati 1x1 transparent pixel
  const pixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );
  return new NextResponse(pixel, {
    status: 200,
    headers: { "Content-Type": "image/gif" },
  });
}
