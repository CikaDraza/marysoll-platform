// app/api/newsletter/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { NewsletterSubscriptionData } from "@/types";
import { subscribeToNewsletter } from "@/lib/newsletterService";

export async function POST(req: NextRequest) {
  try {
    const data: NewsletterSubscriptionData = await req.json();
    const result = await subscribeToNewsletter(data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
