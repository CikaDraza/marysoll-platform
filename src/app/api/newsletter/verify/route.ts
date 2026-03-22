// app/api/newsletter/verify/route.ts
import { verifyNewsletterSubscription } from "@/lib/newsletterService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(
      new URL("/newsletter/verify-failed?reason=no-token", req.url)
    );
  }

  try {
    const result = await verifyNewsletterSubscription(token);

    if (result.success) {
      return NextResponse.redirect(
        new URL("/newsletter/verify-success", req.url)
      );
    } else {
      return NextResponse.redirect(
        new URL(
          `/newsletter/verify-failed?reason=${result.message || "invalid"}`,
          req.url
        )
      );
    }
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(
      new URL("/newsletter/verify-failed?reason=error", req.url)
    );
  }
}
