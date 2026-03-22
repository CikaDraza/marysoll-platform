/**
 * GET /api/public/[tenantSlug]/salon-profile
 *
 * Public — no auth required.
 * Serializes all ObjectIds/Dates to plain strings before returning.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { SalonProfile } from "@/models/SalonProfile";

function serializeWorkingHours(wh: unknown): Record<string, unknown> {
  if (!wh || typeof wh !== "object") return {};
  const result: Record<string, unknown> = {};
  for (const [day, slots] of Object.entries(wh as Record<string, unknown>)) {
    if (Array.isArray(slots)) {
      // New format: [{ from: "08:00", to: "17:00" }, ...]
      result[day] = slots.map((slot: unknown) => {
        if (typeof slot === "object" && slot !== null) {
          const s = slot as Record<string, unknown>;
          // Strip any ObjectId _id from embedded subdocs
          return { from: String(s.from ?? ""), to: String(s.to ?? "") };
        }
        return null;
      }).filter(Boolean);
    } else if (typeof slots === "string") {
      // Legacy: "08:00 - 17:00"
      result[day] = slots;
    }
  }
  return result;
}

function serializeProfile(doc: Record<string, unknown>) {
  return {
    _id: String(doc._id ?? ""),
    name: String(doc.name ?? ""),
    email: String(doc.email ?? ""),
    description: String(doc.description ?? ""),
    logo: doc.logo ? String(doc.logo) : null,
    phone: String(doc.phone ?? ""),
    street: String(doc.street ?? ""),
    city: String(doc.city ?? ""),
    social: {
      instagram: String((doc.social as Record<string, string>)?.instagram ?? ""),
      facebook: String((doc.social as Record<string, string>)?.facebook ?? ""),
      tiktok: String((doc.social as Record<string, string>)?.tiktok ?? ""),
    },
    newsletterEmail: String(doc.newsletterEmail ?? ""),
    workingHours: serializeWorkingHours(doc.workingHours),
    seo: doc.seo ?? {},
    branding: {
      primaryColor: String((doc.branding as Record<string, string>)?.primaryColor ?? "#a855f7"),
      secondaryColor: String((doc.branding as Record<string, string>)?.secondaryColor ?? "#ec4899"),
      fontFamily: String((doc.branding as Record<string, string>)?.fontFamily ?? "Inter"),
    },
    landingTheme: String(doc.landingTheme ?? "theme-1"),
  };
}

type Params = { params: Promise<{ tenantSlug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { tenantSlug } = await params;
  try {
    await connectToDB();
    const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();
    if (!tenant) {
      return NextResponse.json({ success: false, error: "Salon nije pronađen" }, { status: 404 });
    }
    const profile = await SalonProfile.findOne({
      tenantId: (tenant as Record<string, unknown>)._id,
    }).lean();

    return NextResponse.json({
      success: true,
      data: profile ? serializeProfile(profile as Record<string, unknown>) : null,
    });
  } catch (err) {
    console.error("GET /api/public/[tenantSlug]/salon-profile:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
