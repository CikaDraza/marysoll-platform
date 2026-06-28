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
import { normalizeVacations } from "@/helpers/vacations";

// Profil (radno vreme / dostupnost / ručni termini) mora odražavati trenutno
// stanje baze — nikad keširan odgovor, da promene budu vidljive odmah.
export const dynamic = "force-dynamic";
export const revalidate = 0;

function serializeWorkingHours(wh: unknown): Record<string, unknown> {
  if (!wh || typeof wh !== "object") return {};
  const result: Record<string, unknown> = {};
  for (const [day, slots] of Object.entries(wh as Record<string, unknown>)) {
    if (Array.isArray(slots)) {
      // New format: [{ from: "08:00", to: "17:00" }, ...]
      result[day] = slots
        .map((slot: unknown) => {
          if (typeof slot === "object" && slot !== null) {
            const s = slot as Record<string, unknown>;
            // Strip any ObjectId _id from embedded subdocs
            return { from: String(s.from ?? ""), to: String(s.to ?? "") };
          }
          return null;
        })
        .filter(Boolean);
    } else if (typeof slots === "string") {
      // Legacy: "08:00 - 17:00"
      result[day] = slots;
    }
  }
  return result;
}

function serializeManualSlots(ms: unknown): Record<string, unknown> {
  if (!ms || typeof ms !== "object") return {};
  const result: Record<string, unknown> = {};
  for (const [date, slots] of Object.entries(ms as Record<string, unknown>)) {
    if (!Array.isArray(slots)) continue;
    result[date] = slots
      .map((slot: unknown) => {
        if (typeof slot === "object" && slot !== null) {
          const s = slot as Record<string, unknown>;
          const out: Record<string, unknown> = {
            time: String(s.time ?? ""),
            duration:
              typeof s.duration === "number"
                ? s.duration
                : Number(s.duration) || 0,
          };
          if (s.serviceId) out.serviceId = String(s.serviceId);
          return out;
        }
        return null;
      })
      .filter(Boolean);
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
      instagram: String(
        (doc.social as Record<string, string>)?.instagram ?? "",
      ),
      facebook: String((doc.social as Record<string, string>)?.facebook ?? ""),
      tiktok: String((doc.social as Record<string, string>)?.tiktok ?? ""),
    },
    workingHours: serializeWorkingHours(doc.workingHours),
    vacations: normalizeVacations(doc.vacations),
    availabilityMode:
      doc.availabilityMode === "manualSlots" ? "manualSlots" : "workingHours",
    manualSlots: serializeManualSlots(doc.manualSlots),
    showWorkingHours: doc.showWorkingHours !== false,
    seo: doc.seo ?? {},
    branding: {
      primaryColor: String(
        (doc.branding as Record<string, string>)?.primaryColor ?? "#a855f7",
      ),
      secondaryColor: String(
        (doc.branding as Record<string, string>)?.secondaryColor ?? "#ec4899",
      ),
      fontFamily: String(
        (doc.branding as Record<string, string>)?.fontFamily ?? "Inter",
      ),
    },
    landingTheme: String(doc.landingTheme ?? "theme-1"),
    landingStructure: doc.landingStructure ?? null,
    contactEmail: String((doc.contactEmail as string) ?? ""),
    newsletterEmail: String((doc.newsletterEmail as string) ?? ""),
  };
}

type Params = { params: Promise<{ tenantSlug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { tenantSlug } = await params;
  try {
    await connectToDB();
    const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Salon nije pronađen" },
        { status: 404 },
      );
    }
    const profile = await SalonProfile.findOne({
      tenantId: (tenant as Record<string, unknown>)._id,
    }).lean();

    return NextResponse.json({
      success: true,
      data: profile
        ? serializeProfile(profile as Record<string, unknown>)
        : null,
    });
  } catch (err) {
    console.error("GET /api/public/[tenantSlug]/salon-profile:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
