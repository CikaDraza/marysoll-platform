/**
 * ClientHomePage — Server Component
 *
 * Fetches tenant data by:
 *   1. tenantSlug from x-tenant-slug header (subdomain routing)
 *   2. Custom domain lookup
 *   3. Path-based slug (localhost/slug dev routing)
 *
 * Renders the correct theme via ThemeLayout.
 */
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { SalonProfile } from "@/models/SalonProfile";
import { Service } from "@/models/Service";
import { Testimonial } from "@/models/Testimonial";
import { headers } from "next/headers";
import { isIOSUserAgent } from "@/lib/browser-detect";
import { ThemeLayout } from "@/components/themes/ThemeLayout";
import type { LandingTheme } from "@/types";
import type { PublicTestimonial } from "@/types/public-testimonials";
import type {
  IService,
  LandingStructure,
  SalonProfileData,
  ManualSlotsMap,
  TenantThemePages,
  ThemeBookingPreview,
} from "@/types";
import { landingStructureToThemeDocument } from "@/lib/platform/theme-client";
import {
  buildThemeBranding,
  buildThemeNative,
} from "@/lib/platform/theme-native";
import {
  preloadedBlockDataSource,
  resolveBlockData,
} from "@/lib/platform/blocks";
import { normalizeVacations } from "@/helpers/vacations";
import { shouldUseTheme8TestTestimonials } from "@/helpers/theme8DevelopmentTestimonials";
import { getTenantStats } from "@/lib/tenant/getTenantStats";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { mapBlogPost, publishedBlogFilter } from "@/lib/tenant/blogPosts";
import { resolveTenantCapabilitySnapshot } from "@/lib/platform/capabilities-server";
import {
  resolveTheme9EducationFacts,
  theme9NavNeedsFacts,
} from "@/lib/theme9/navigation-server";

interface Props {
  tenantSlug: string;
}

async function getTenantData(tenantSlug: string) {
  await connectToDB();

  const headersList = await headers();
  const hostname = headersList.get("host")?.split(":")[0] ?? "";
  const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

  let tenant = null;

  if (tenantSlug && tenantSlug !== "default" && tenantSlug !== "") {
    tenant = await Tenant.findOne({ slug: tenantSlug }).lean();
  } else if (!hostname.endsWith(BASE_DOMAIN) && hostname !== "localhost") {
    // Custom domain lookup
    tenant = await Tenant.findOne({
      customDomain: hostname,
      customDomainVerified: true,
    }).lean();
  }

  if (!tenant) return null;

  const tenantId = (tenant as Record<string, unknown>)._id;

  const salon = await SalonProfile.findOne({ tenantId }).lean();
  const testimonialLimit =
    (salon as { landingTheme?: string } | null)?.landingTheme === "theme-8"
      ? 3
      : 6;
  const [services, testimonials, tenantStats] = await Promise.all([
    Service.find({ tenantId }).lean(),
    Testimonial.find({ tenantId, isApproved: true })
      .sort({ createdAt: -1 })
      .limit(testimonialLimit)
      .lean(),
    getTenantStats(String(tenantId)),
  ]);

  return {
    tenant,
    tenantId,
    salon,
    services,
    testimonials,
    tenantStats,
    showTheme8TestimonialFixtures:
      (salon as { landingTheme?: string } | null)?.landingTheme === "theme-8" &&
      shouldUseTheme8TestTestimonials(hostname),
  };
}

export async function ClientHomePage({ tenantSlug }: Props) {
  const data = await getTenantData(tenantSlug);

  // x-tenant-base-path is set by the proxy to "/{slug}" only on localhost
  // path-based dev. On subdomain and custom domain it is always "".
  // Theme headers use `tenantSlug ? `/${tenantSlug}` : ""` to build hrefs, so
  // passing undefined produces correct root-relative links (/login, /usluge)
  // for every host-based routing mode.
  const headersList = await headers();
  const basePath = headersList.get("x-tenant-base-path") ?? "";
  const themeSlug = basePath ? tenantSlug || undefined : undefined;

  // iOS "safe" render: na iPhone-u hydration ume da padne (in-app browser /
  // stari Safari) i strana ostane na preloaderu / opacity:0 sadržaju. Detekciju
  // radimo iz UA-ja SERVER-side da SSR HTML odmah bude vidljiv (bez animacija).
  const reduceMotion = isIOSUserAgent(headersList.get("user-agent") ?? "");

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center p-8 max-w-md">
          <div className="text-6xl mb-5">💅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Salon nije pronađen
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Subdomen{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
              {tenantSlug || "–"}
            </code>{" "}
            ne postoji ili salon još uvek nije aktivan.
          </p>
          {process.env.NODE_ENV === "development" && (
            <p className="mt-4 text-xs text-gray-400">
              Dev tip: Postavi <code>DEV_DOMAIN_TYPE=client</code> i{" "}
              <code>CUSTOM_CLIENT_DOMAIN=&lt;slug&gt;</code> u{" "}
              <code>.env.local</code>, ili poseti{" "}
              <code>localhost:3006/&lt;slug&gt;</code>
            </p>
          )}
        </div>
      </div>
    );
  }

  const {
    salon,
    services,
    testimonials,
    tenantStats,
    showTheme8TestimonialFixtures,
  } = data;

  const s = salon as
    | (Record<string, unknown> & { branding?: Record<string, string> })
    | null;
  const landingTheme: LandingTheme =
    (s?.landingTheme as LandingTheme) ?? "theme-1";

  // Serialize for client-safe props
  const salonData: SalonProfileData = {
    _id: String(s?._id ?? ""),
    name: String(s?.name ?? ""),
    email: String(s?.email ?? ""),
    description: String(s?.description ?? ""),
    landingTheme,
    // Ova projekcija je RUCNA: svako novo polje profila mora i ovde, inace
    // tiho ne stigne do teme (bez greske, bez tipa koji bi to uhvatio).
    shortDescription: s?.shortDescription
      ? String(s.shortDescription)
      : undefined,
    themePages: s?.themePages
      ? (JSON.parse(JSON.stringify(s.themePages)) as TenantThemePages)
      : undefined,
    themeBookingPreview: s?.themeBookingPreview
      ? (JSON.parse(JSON.stringify(s.themeBookingPreview)) as ThemeBookingPreview)
      : undefined,
    landingStructure: s?.landingStructure
      ? (JSON.parse(JSON.stringify(s.landingStructure)) as LandingStructure)
      : undefined,
    logo: s?.logo ? String(s.logo) : undefined,
    phone: String(s?.phone ?? ""),
    street: String(s?.street ?? ""),
    city: String(s?.city ?? ""),
    social: {
      instagram: String((s?.social as Record<string, string>)?.instagram ?? ""),
      facebook: String((s?.social as Record<string, string>)?.facebook ?? ""),
      tiktok: String((s?.social as Record<string, string>)?.tiktok ?? ""),
    },
    newsletterEmail: String(s?.newsletterEmail ?? ""),
    branding: {
      primaryColor: s?.branding?.primaryColor ?? "#a855f7",
      secondaryColor: s?.branding?.secondaryColor ?? "#ec4899",
      fontFamily: s?.branding?.fontFamily ?? "Inter",
    },
    workingHours:
      s?.workingHours &&
      typeof s.workingHours === "object" &&
      !Array.isArray(s.workingHours)
        ? (s.workingHours as Record<string, unknown>)
        : undefined,
    vacations: normalizeVacations(s?.vacations),
    availabilityMode:
      s?.availabilityMode === "manualSlots" ? "manualSlots" : "workingHours",
    manualSlots:
      s?.manualSlots &&
      typeof s.manualSlots === "object" &&
      !Array.isArray(s.manualSlots)
        ? (JSON.parse(JSON.stringify(s.manualSlots)) as ManualSlotsMap)
        : undefined,
    showWorkingHours: s?.showWorkingHours !== false,
  };

  const serviceList = (services as Record<string, unknown>[]).map((sv) => ({
    _id: String(sv._id),
    name: String(sv.name ?? ""),
    category: String(sv.category ?? ""),
    subcategory: sv.subcategory ? String(sv.subcategory) : undefined,
    type: (sv.type as "single" | "group" | "variant") ?? "single",
    basePrice: sv.basePrice != null ? Number(sv.basePrice) : undefined,
    priceMode: sv.priceMode === "on_request" ? "on_request" : "fixed",
    duration: sv.duration ? Number(sv.duration) : undefined,
    description: String(sv.description ?? ""),
    items: Array.isArray(sv.items) ? sv.items.map(String) : [],
    variants: Array.isArray(sv.variants)
      ? sv.variants.map((v: unknown) => {
          const vv = v as Record<string, unknown>;
          return {
            name: String(vv.name ?? ""),
            price: Number(vv.price ?? 0),
            priceMode: vv.priceMode === "on_request" ? "on_request" : "fixed",
            duration: Number(vv.duration ?? 0),
            perItem: Boolean(vv.perItem),
            description: vv.description ? String(vv.description) : undefined,
          };
        })
      : [],
    extras: Array.isArray(sv.extras)
      ? sv.extras.map((e: unknown) => {
          const ee = e as Record<string, unknown>;
          return {
            name: String(ee.name ?? ""),
            price: Number(ee.price ?? 0),
            priceMode: ee.priceMode === "on_request" ? "on_request" : "fixed",
            duration: Number(ee.duration ?? 0),
            perItem: Boolean(ee.perItem),
          };
        })
      : [],
    services: Array.isArray(sv.services)
      ? sv.services.map((s: unknown) => {
          const ss = s as Record<string, unknown>;
          return {
            name: String(ss.name ?? ""),
            price: Number(ss.price ?? 0),
            priceMode: ss.priceMode === "on_request" ? "on_request" : "fixed",
            duration: Number(ss.duration ?? 0),
            description: String(ss.description ?? ""),
          };
        })
      : [],
    icon: sv.icon ? String(sv.icon) : undefined,
    featured:
      (sv.featured as "main" | "second" | "third" | "none" | null) ?? null,
    subscription: (() => {
      const sub = sv.subscription as Record<string, unknown> | undefined;
      if (!sub)
        return {
          enabled: false,
          priceMonthly: null,
          startDate: null,
          endDate: null,
        };
      return {
        enabled: Boolean(sub.enabled ?? false),
        subscriptionType: sub.subscriptionType as
          | "monthly"
          | "package"
          | undefined,
        treatmentCount:
          sub.treatmentCount != null ? Number(sub.treatmentCount) : null,
        priceMonthly:
          sub.priceMonthly != null ? Number(sub.priceMonthly) : null,
        startDate: sub.startDate ? String(sub.startDate) : null,
        endDate: sub.endDate ? String(sub.endDate) : null,
      };
    })(),
    createdAt: String(sv.createdAt ?? ""),
    updatedAt: String(sv.updatedAt ?? ""),
  })) as IService[];

  const testimonialList: PublicTestimonial[] = (
    testimonials as Record<string, unknown>[]
  ).map((t) => ({
    _id: String(t._id),
    clientName: String(t.clientName ?? ""),
    rating: Number(t.rating ?? 5),
    comment: String(t.comment ?? ""),
    adminReply: t.adminReply ? String(t.adminReply) : undefined,
  }));

  // ── Feature blokovi: raspored + podaci, u ISTOM server prolazu ──────────
  // `preloadedBlockDataSource` deli već povučene podatke (salon/usluge/utiske),
  // pa loaderi ne pokreću nijedan nov upit — brzina strane ostaje ista (T2A).
  const themeDocument = landingStructureToThemeDocument(
    salonData.landingStructure,
    { theme: landingTheme },
  );
  const capabilitySnapshot = await resolveTenantCapabilitySnapshot(
    String(data.tenantId),
  );
  const blockData = await resolveBlockData({
    document: themeDocument,
    theme: landingTheme,
    tenantSlug: themeSlug,
    ...(capabilitySnapshot ? { capabilities: capabilitySnapshot } : {}),
    deps: preloadedBlockDataSource({
      salon: salonData,
      services: serviceList,
      testimonials: testimonialList,
      tenantStats,
      // Lenj: poziva se SAMO ako tema ima blog blok. Teme bez njega ne plaćaju
      // upit, a one koje ga imaju dobijaju objave u istom server prolazu —
      // bez klijentskog waterfall-a posle hidratacije.
      blogPosts: async (limit) => {
        const campaigns = await NewsletterCampaign.find(
          publishedBlogFilter(data.tenantId),
        )
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();
        return JSON.parse(JSON.stringify(campaigns)).map(mapBlogPost);
      },
    }),
  });

  // 2C: navigacija sme da ponudi samo odredišta koja stvarno imaju sadržaj.
  // Dostupnost podstranica se čita iz profila (bez upita); ovde se dovlači samo
  // ono što traži bazu, i to samo za temu kojoj treba.
  const educationSurface = theme9NavNeedsFacts(landingTheme)
    ? await resolveTheme9EducationFacts({ tenantId: data.tenantId })
    : undefined;

  // Native delovi teme dobijaju svoj view model — bez domenskih tipova i bez
  // CMS flagova u zajedničkom kontraktu.
  const themeNative = buildThemeNative(landingTheme, {
    salon: salonData,
    services: serviceList,
    testimonials: testimonialList,
    tenantStats,
    tenantSlug: themeSlug,
    clientSlug: tenantSlug || undefined,
    showTheme8TestimonialFixtures,
    educationSurface,
  });

  // Shell (header/footer) i dizajn tokeni se takođe računaju ovde — tema ih
  // dobija gotove, pa `ThemeLayout` ostaje čist dispečer.
  const branding = buildThemeBranding(salonData);
  const galleryEnabled =
    salonData.landingStructure?.landing?.gallery?.enabled ?? true;

  const headerProps = {
    tenantSlug: themeSlug,
    clientSlug: tenantSlug || themeSlug,
    salonName: salonData.name,
    salonLogo: salonData.logo ?? null,
    instagramUrl: galleryEnabled
      ? salonData.social?.instagram || ""
      : undefined,
    primaryColor: salonData.branding?.primaryColor || "#a855f7",
    secondaryColor: salonData.branding?.secondaryColor || "#ec4899",
  };

  const footerProps = {
    tenantSlug: themeSlug,
    salonName: salonData.name,
    description: salonData.description ?? undefined,
    logo: salonData.logo ?? undefined,
    city: salonData.city ?? undefined,
    instagram: salonData.social?.instagram,
    facebook: salonData.social?.facebook,
    tiktok: salonData.social?.tiktok,
  };

  return (
    <ThemeLayout
      theme={landingTheme}
      document={themeDocument}
      blockData={blockData}
      themeNative={themeNative}
      brandingVars={branding.brandingVars}
      googleFontHref={branding.googleFontHref}
      headerProps={headerProps}
      footerProps={footerProps}
      tenantSlug={themeSlug}
      clientSlug={tenantSlug || undefined}
      reduceMotion={reduceMotion}
    />
  );
}
