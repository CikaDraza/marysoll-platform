// app/api/newsletter/unsubscribe/route.ts
import { unsubscribeFromNewsletter } from "@/lib/newsletterService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(
      new URL("/newsletter/verify-failed?reason=no-token", req.url)
    );
  }

  try {
    await unsubscribeFromNewsletter(token);
    return NextResponse.redirect(
      new URL("/newsletter/unsubscribe-success", req.url)
    );
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.redirect(
      new URL("/newsletter/verify-failed?reason=invalid", req.url)
    );
  }
}
