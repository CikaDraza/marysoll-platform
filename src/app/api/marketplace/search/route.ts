/**
 * GET /api/marketplace/search
 *
 * Correct aggregation pipeline:
 *   Service (category) → tenantIds → SalonProfile (city) → salonIds → Slot (free, time)
 *
 * NEVER fetches all salons then filters in JS.
 * NEVER returns unrelated salons.
 * NEVER returns fake/hardcoded slots.
 *
 * Query params:
 *   category   slug ("massage") or canonical ("Masaža")
 *   city       string — matched case-insensitively against SalonProfile.city
 *   date       YYYY-MM-DD (defaults to today)
 *   time       HH:MM (creates ±1h lower / +2h upper window)
 *   lat        user latitude  (for distance sorting)
 *   lng        user longitude
 *   limit      max results (default 20, max 50)
 */

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { Service } from "@/models/Service";
import { SalonProfile } from "@/models/SalonProfile";
import { Slot } from "@/models/Slot";
import { CATEGORY_MAP } from "@/lib/categoryService";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { checkRateLimit } from "@/lib/middleware/rateLimiter";
import { getDistanceKm } from "@/lib/utils/distance";
import { buildCityRegex } from "@/lib/utils/cityMatch";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SlotDoc {
  _id: Types.ObjectId;
  salonId: Types.ObjectId;
  serviceId?: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  status: string;
}

interface SalonDoc {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  city?: string;
  lat?: number;
  lng?: number;
  logo?: string;
  slug?: string;
  phone?: string;
}

interface ServiceDoc {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  category: string;
  categorySlug?: string;
  duration?: number;
  basePrice?: number;
  priceMode?: "fixed" | "on_request";
}

// ── Category resolution ───────────────────────────────────────────────────────

function resolveCategory(raw: string): {
  slug: string;
  label: string;
  synonyms: string[];
} | null {
  if (!raw) return null;

  // Direct slug match
  const direct = CATEGORY_MAP[raw.toLowerCase()];
  if (direct) {
    return {
      slug: raw.toLowerCase(),
      label: direct.label,
      synonyms: direct.synonyms,
    };
  }

  // Canonical label match (e.g., "Masaža" → massage)
  for (const [slug, cat] of Object.entries(CATEGORY_MAP)) {
    if (cat.label.toLowerCase() === raw.toLowerCase()) {
      return { slug, label: cat.label, synonyms: cat.synonyms };
    }
  }

  // Synonym fuzzy match
  const normRaw = raw
    .toLowerCase()
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/č/g, "c")
    .replace(/ć/g, "c")
    .replace(/đ/g, "dj");
  for (const [slug, cat] of Object.entries(CATEGORY_MAP)) {
    const allTerms = [cat.label, ...cat.synonyms].map((s) =>
      s
        .toLowerCase()
        .replace(/š/g, "s")
        .replace(/ž/g, "z")
        .replace(/č/g, "c")
        .replace(/ć/g, "c")
        .replace(/đ/g, "dj"),
    );
    if (allTerms.some((t) => t.includes(normRaw) || normRaw.includes(t))) {
      return { slug, label: cat.label, synonyms: cat.synonyms };
    }
  }

  return null;
}

// ── Date/time helpers ─────────────────────────────────────────────────────────

function todayLocalStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayBounds(dateStr: string): { gte: Date; lt: Date } {
  const gte = new Date(`${dateStr}T00:00:00`);
  const lt = new Date(`${dateStr}T00:00:00`);
  lt.setDate(lt.getDate() + 1);
  return { gte, lt };
}

function futureBounds(daysAhead: number): { gte: Date; lt: Date } {
  const gte = new Date();
  const lt = new Date();
  lt.setDate(lt.getDate() + daysAhead);
  lt.setHours(23, 59, 59, 999);
  return { gte, lt };
}

// ── Slot query ────────────────────────────────────────────────────────────────

async function querySlots(
  salonIds: Types.ObjectId[],
  timeBounds: { gte: Date; lt: Date },
  hourWindow?: { from: number; to: number },
  limit = 60,
): Promise<SlotDoc[]> {
  const match: Record<string, unknown> = {
    salonId: { $in: salonIds },
    status: "maria",
    startTime: { $gte: timeBounds.gte, $lt: timeBounds.lt },
  };

  let slots = (await Slot.find(match)
    .sort({ startTime: 1 })
    .limit(limit)
    .lean()) as unknown as SlotDoc[];

  if (hourWindow) {
    const inWindow = slots.filter((s) => {
      const h = s.startTime.getHours();
      return h >= hourWindow.from && h <= hourWindow.to;
    });
    // Soft window — fall back to all slots if window yields nothing
    if (inWindow.length > 0) slots = inWindow;
  }

  return slots;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const verify = verifySignature(req, "");
  if (!verify.ok) {
    return NextResponse.json(
      { error: verify.error },
      { status: verify.status },
    );
  }

  const apiKey = req.headers.get("x-api-key") ?? "dev";
  if (!checkRateLimit(apiKey)) {
    return NextResponse.json({ error: "Previše zahteva" }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const rawCategory = searchParams.get("category") ?? "";
  const rawCity = searchParams.get("city") ?? "";
  const rawDate = searchParams.get("date") ?? todayLocalStr();
  const rawTime = searchParams.get("time") ?? "";
  const lat = searchParams.get("lat")
    ? parseFloat(searchParams.get("lat")!)
    : null;
  const lng = searchParams.get("lng")
    ? parseFloat(searchParams.get("lng")!)
    : null;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  await connectToDB();

  // ── 1. Resolve category ───────────────────────────────────────────────────

  const cat = resolveCategory(rawCategory);

  console.log(
    "[search] category input:",
    rawCategory,
    "→",
    cat?.label ?? "none",
  );

  // ── 2. Find matching services (Mongo query, not JS filter) ────────────────

  let services: ServiceDoc[] = [];
  let tenantIds: Types.ObjectId[] = [];

  if (cat) {
    // Build a regex that matches the canonical label OR any synonym
    const terms = [cat.label, ...cat.synonyms].map((t) =>
      t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
    const categoryRegex = new RegExp(terms.join("|"), "i");

    services = (await Service.find({
      $or: [{ category: categoryRegex }, { categorySlug: cat.slug }],
    })
      .select(
        "_id tenantId name category categorySlug duration basePrice priceMode",
      )
      .lean()) as unknown as ServiceDoc[];

    tenantIds = [
      ...new Map(
        services.map((s) => [String(s.tenantId), s.tenantId]),
      ).values(),
    ];

    console.log(
      "[search] matched services:",
      services.length,
      "→ tenantIds:",
      tenantIds.length,
    );
  }

  // ── 3. Find salons (by tenantId + city) ───────────────────────────────────

  const salonFilter: Record<string, unknown> = {
    isDemo: { $ne: true },
    marketplaceEnabled: true,
  };

  if (tenantIds.length > 0) salonFilter.tenantId = { $in: tenantIds };
  if (rawCity) salonFilter.city = { $regex: buildCityRegex(rawCity) };

  const salons = (await SalonProfile.find(salonFilter)
    .select("_id tenantId name city lat lng logo slug phone")
    .lean()) as unknown as SalonDoc[];

  const salonIds = salons.map((s) => s._id);

  console.log(
    "[search] matched salons:",
    salons.length,
    "(city:",
    rawCity || "any",
    ")",
  );

  // Maps for quick lookup
  const salonById = new Map(salons.map((s) => [String(s._id), s]));
  const servicesByTenantId = new Map<string, ServiceDoc>();
  for (const svc of services) {
    const tid = String(svc.tenantId);
    if (!servicesByTenantId.has(tid)) servicesByTenantId.set(tid, svc);
  }

  // ── 4. Parse time window ──────────────────────────────────────────────────

  let hourWindow: { from: number; to: number } | undefined;
  if (rawTime) {
    const h = parseInt(rawTime.split(":")[0], 10);
    if (!isNaN(h)) {
      hourWindow = { from: Math.max(0, h - 1), to: Math.min(23, h + 2) };
    }
  }

  // ── 5. Find free slots — 4-level fallback (all in Mongo, no JS scan) ─────

  let slots: SlotDoc[] = [];
  let fallbackLevel = 0;
  let fallbackLabel = "no-results";
  const now = new Date();

  if (salonIds.length > 0) {
    // Level 1: requested date + time window
    const { gte, lt } = dayBounds(rawDate);
    const l1Gte = gte < now ? now : gte;

    slots = await querySlots(
      salonIds,
      { gte: l1Gte, lt },
      hourWindow,
      limit * 3,
    );
    if (slots.length > 0) {
      fallbackLevel = 1;
      fallbackLabel = "exact-date-time";
    }

    // Level 2: requested date, any time
    if (slots.length === 0) {
      slots = await querySlots(
        salonIds,
        { gte: l1Gte, lt },
        undefined,
        limit * 3,
      );
      if (slots.length > 0) {
        fallbackLevel = 2;
        fallbackLabel = "exact-date-any-time";
      }
    }

    // Level 3: next 14 days, same category salons
    if (slots.length === 0) {
      const f = futureBounds(14);
      slots = await querySlots(
        salonIds,
        { gte: now, lt: f.lt },
        undefined,
        limit * 3,
      );
      if (slots.length > 0) {
        fallbackLevel = 3;
        fallbackLabel = "next-14-days";
      }
    }

    // Level 4: no city filter — any salon providing this category
    if (slots.length === 0 && rawCity && tenantIds.length > 0) {
      const anyCitySalons = (await SalonProfile.find({
        tenantId: { $in: tenantIds },
        isDemo: { $ne: true },
        marketplaceEnabled: true,
      })
        .select("_id tenantId name city lat lng logo slug phone")
        .lean()) as unknown as SalonDoc[];

      const anyCityIds = anyCitySalons.map((s) => s._id);
      // Add to salonById for later join
      for (const s of anyCitySalons) salonById.set(String(s._id), s);

      const f = futureBounds(14);
      slots = await querySlots(
        anyCityIds,
        { gte: now, lt: f.lt },
        undefined,
        limit * 3,
      );
      if (slots.length > 0) {
        fallbackLevel = 4;
        fallbackLabel = "any-city";
      }
    }

    // Level 5: same city, any category (no service filter)
    if (slots.length === 0 && rawCity) {
      const cityOnlySalons = (await SalonProfile.find({
        city: { $regex: buildCityRegex(rawCity) },
        isDemo: { $ne: true },
        marketplaceEnabled: true,
      })
        .select("_id tenantId name city lat lng logo slug phone")
        .limit(20)
        .lean()) as unknown as SalonDoc[];

      for (const s of cityOnlySalons) salonById.set(String(s._id), s);
      const cityIds = cityOnlySalons.map((s) => s._id);
      const f = futureBounds(14);
      slots = await querySlots(
        cityIds,
        { gte: now, lt: f.lt },
        undefined,
        limit * 3,
      );
      if (slots.length > 0) {
        fallbackLevel = 5;
        fallbackLabel = "city-any-category";
      }
    }
  }

  console.log(
    "[search] slots found:",
    slots.length,
    "| fallback level:",
    fallbackLevel,
    `(${fallbackLabel})`,
  );

  // ── 6. Build results (join salon + service data) ──────────────────────────

  const results: unknown[] = [];
  const seenSlotIds = new Set<string>();

  for (const slot of slots) {
    const slotId = String(slot._id);
    if (seenSlotIds.has(slotId)) continue;
    seenSlotIds.add(slotId);

    const salon = salonById.get(String(slot.salonId));
    if (!salon) continue;

    const tenantId = String(salon.tenantId);
    const svc = servicesByTenantId.get(tenantId);

    const salonLat = typeof salon.lat === "number" ? salon.lat : null;
    const salonLng = typeof salon.lng === "number" ? salon.lng : null;
    const distanceKm =
      lat != null && lng != null && salonLat != null && salonLng != null
        ? Math.round(getDistanceKm(lat, lng, salonLat, salonLng) * 10) / 10
        : null;

    results.push({
      slot: {
        id: slotId,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        status: slot.status,
      },
      service: svc
        ? {
            id: String(svc._id),
            name: svc.name,
            category: svc.category,
            slug: svc.categorySlug ?? cat?.slug ?? "",
            duration: svc.duration ?? 60,
            price: svc.basePrice ?? null,
            priceMode: svc.priceMode === "on_request" ? "on_request" : "fixed",
          }
        : null,
      salon: {
        id: String(salon._id),
        name: salon.name,
        city: salon.city ?? "",
        lat: salonLat,
        lng: salonLng,
        logo: salon.logo ?? null,
        slug: salon.slug ?? null,
        phone: salon.phone ?? null,
      },
      distanceKm,
      fallbackLevel,
    });

    if (results.length >= limit) break;
  }

  console.log("[search] returning:", results.length, "results");

  return NextResponse.json({
    results,
    total: results.length,
    fallbackLevel,
    fallbackLabel,
    debug: {
      category: cat?.label ?? null,
      categorySlug: cat?.slug ?? null,
      city: rawCity || null,
      date: rawDate,
      timeWindow: hourWindow
        ? `${hourWindow.from}:00–${hourWindow.to}:00`
        : null,
      servicesFound: services.length,
      tenantIds: tenantIds.length,
      salonsFound: salons.length,
      slotsFound: slots.length,
      returned: results.length,
    },
  });
}
