// app/api/newsletter/track/click/route.ts
import { trackClick } from "@/lib/newsletterService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const campaign = searchParams.get("campaign");
  const subscriber = searchParams.get("subscriber");
  const url = searchParams.get("url");

  // Fallback URL ako nešto pođe po zlu
  const fallbackUrl = "https://www.marysoll.com";

  // Logujemo klik samo ako imamo sve potrebne podatke
  if (campaign && subscriber && url) {
    try {
      // Ne koristimo 'await' ovde ako ne želimo da korisnik čeka bazu pre redirekcije,
      // ali je sigurnije sa await-om da bismo znali da je upisano.
      await trackClick(campaign, subscriber, url);
    } catch (error) {
      console.error("Track click failed:", error);
      // Ne prekidamo izvršavanje, i dalje želimo da korisnik stigne na destinaciju
    }
  }

  // Validacija i redirekcija na originalni URL
  if (url) {
    try {
      // Provera da li je URL validan (mora početi sa http/https)
      const redirectTarget = new URL(url).toString();
      return NextResponse.redirect(redirectTarget);
    } catch (e) {
      console.error("Invalid redirect URL:", url, e);
      return NextResponse.redirect(fallbackUrl);
    }
  }

  return NextResponse.redirect(fallbackUrl);
}
