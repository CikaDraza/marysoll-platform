/**
 * GET /api/tenants/domain-search?name=kikikiss.beauty
 *
 * Checks domain availability via Vercel Registrar API (v1 — new endpoint).
 * Old v4/domains/status was sunsetted on November 9, 2025.
 * New endpoint: GET /v1/registrar/domains/{domain}/availability
 *
 * Docs: https://vercel.com/changelog/new-domains-registrar-api-for-domain-search-pricing-purchase-and-management-R7NazqfLzVDvZlsmFxH7y
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth-server";

interface VercelRegistrarAvailabilityResponse {
  available: boolean;
  price?: number;
  premium?: boolean;
}

// Must have at least one dot and a valid TLD — e.g. kikikiss.beauty, my-salon.com
const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.response;
    if (auth instanceof NextResponse) return auth;

    const name = req.nextUrl.searchParams.get("name")?.trim().toLowerCase();
    if (!name) {
      return NextResponse.json(
        { error: "Parametar 'name' je obavezan." },
        { status: 400 },
      );
    }

    // Validate before hitting Vercel — saves a round-trip and gives a clear message
    if (!DOMAIN_REGEX.test(name)) {
      return NextResponse.json(
        {
          error: name.includes(".")
            ? `Neispravan format domena: "${name}". Primer: kikikiss.beauty`
            : `Domen mora sadržati ekstenziju. Primer: ${name}.com ili ${name}.beauty`,
        },
        { status: 400 },
      );
    }

    const token = process.env.VERCEL_API_TOKEN;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!token) {
      return NextResponse.json(
        { error: "Vercel API nije konfigurisano." },
        { status: 503 },
      );
    }

    const url = new URL(
      `https://api.vercel.com/v1/registrar/domains/${encodeURIComponent(name)}/availability`,
    );
    if (teamId) url.searchParams.set("teamId", teamId);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Vercel registrar availability error:", errData);

      // Detect Vercel parse/validation errors and return a user-friendly message
      const isParseError =
        errData?._tag === "HttpApiDecodeError" ||
        (typeof errData?.message === "string" &&
          errData.message.includes("parse checks"));

      return NextResponse.json(
        {
          error: isParseError
            ? `Neispravan domen: "${name}". Unesite pun domen sa ekstenzijom, npr. ${name}.com`
            : "Vercel API greška pri proveri dostupnosti.",
        },
        { status: isParseError ? 400 : 502 },
      );
    }

    const data: VercelRegistrarAvailabilityResponse = await res.json();

    const purchaseUrl = `https://vercel.com/domains?search=${encodeURIComponent(name)}`;

    return NextResponse.json({
      name,
      available: data.available ?? false,
      price: data.price ?? null,
      premium: data.premium ?? false,
      purchaseUrl,
    });
  } catch (err) {
    console.error("GET /api/tenants/domain-search:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
