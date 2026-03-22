/**
 * PUT /api/tenants/custom-domain
 *
 * Allows a salon owner to set or remove their custom domain.
 * Requires admin auth.
 *
 * Body: { customDomain: "kikikiss.beauty" | "" | null }
 *
 * Notes:
 * - One custom domain per tenant
 * - Domain must be unique across all tenants
 * - customDomainVerified is reset to false when domain changes
 * - Salon owner must also configure DNS CNAME/A record pointing to Vercel
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";

export async function PUT(req: NextRequest) {
  try {
    await connectToDB();

    const auth = (await requireAdmin(req)) as
      | { decoded: DecodedToken }
      | NextResponse;
    if (auth instanceof NextResponse) return auth;
    const { decoded } = auth;

    if (!decoded.tenantId) {
      return NextResponse.json(
        { error: "Tenant nije pronađen" },
        { status: 400 },
      );
    }

    const { customDomain } = await req.json();

    // Normalize: empty string or null = remove custom domain
    const normalized = customDomain?.trim().toLowerCase() || null;

    if (normalized) {
      // Basic domain format validation
      const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/;
      if (!domainRegex.test(normalized)) {
        return NextResponse.json(
          { error: "Neispravan format domena. Primer: kikikiss.beauty" },
          { status: 400 },
        );
      }

      // Check if domain is already taken by another tenant
      const existing = await Tenant.findOne({
        customDomain: normalized,
        _id: { $ne: decoded.tenantId },
      }).lean();

      if (existing) {
        return NextResponse.json(
          { error: "Ovaj domen je već registrovan za drugi salon" },
          { status: 409 },
        );
      }
    }

    const updated = await Tenant.findByIdAndUpdate(
      decoded.tenantId,
      {
        $set: {
          customDomain: normalized,
          customDomainVerified: false, // reset verification on every change
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { error: "Tenant nije pronađen" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      customDomain: (updated as Record<string, unknown>).customDomain,
      message: normalized
        ? "Custom domen je sačuvan. Podesite DNS zapis i sačekajte verifikaciju."
        : "Custom domen je uklonjen.",
    });
  } catch (err) {
    console.error("PUT /api/tenants/custom-domain:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
