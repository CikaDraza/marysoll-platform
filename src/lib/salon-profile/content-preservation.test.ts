import { describe, expect, it } from "vitest";
import type {
  LandingStructure,
  TenantThemePages,
  ThemeBookingPreview,
} from "@/types";
import {
  mapLandingStructureForAdmin,
  mergeLandingStructureUpdate,
} from "./content-preservation";

function theme9Fixture(): LandingStructure {
  return {
    landing: {
      hero: {
        enabled: true,
        eyebrow: "Stručna edukacija o nezi kože",
        quote: "Koži pristupamo planski.",
        headline: "Razumi svoju kožu",
        subheadline: "Stručna podrška za održive rezultate.",
        whereWhatForWhom: "Online i uživo · za klijente i profesionalce",
        contact: { location: "Beograd", phone: "+38160000000" },
        socialLinks: { instagram: "https://instagram.com/expert" },
        ctas: {
          primary: { text: "Zakaži konsultaciju", href: "/konsultacije" },
          secondary: { text: "Saznaj više", href: "/za-klijente" },
        },
        image: { src: "/hero.jpg", alt: "Ekspertkinja" },
      },
      stats: [{ value: "10+", label: "godina prakse" }],
      about: {
        enabled: true,
        eyebrow: "O meni",
        headline: "Znanje pre trenda",
        paragraphs: ["Individualan i stručan pristup."],
        links: [{ text: "Biografija", url: "/za-klijente", type: "link" }],
        credentials: [
          { label: "Obrazovanje", value: "Kozmetolog", note: "Beograd" },
        ],
        showCredentials: false,
        badge: { name: "Marina", role: "Skin educator" },
        image: { src: "/about.jpg", alt: "Marina" },
      },
      artists: { enabled: false, headline: "Tim", members: [] },
      servicesPreview: {
        enabled: false,
        headline: "Usluge",
        subheadline: "Pregled",
        showIcons: false,
      },
      appointmentSection: {
        enabled: false,
        headline: "Termin",
        subheadline: "Izaberi vreme",
        instructions: [],
      },
      testimonials: { enabled: false, headline: "Iskustva" },
      gallery: {
        enabled: false,
        headline: "Galerija",
        subheadline: "Radovi",
        instagram: { username: "expert", link: "", ctaText: "" },
        treatments: [],
        images: [],
      },
      faq: {
        enabled: false,
        headline: "Pitanja",
        subheadline: "Odgovori",
        support: { text: "Pišite", email: "hello@example.com" },
        items: [],
      },
      blog: { enabled: true, headline: "Iz dnevnika", paragraph: "Članci" },
      perks: {
        enabled: false,
        pill: "Nega",
        eyebrow: "Pogodnosti",
        headline: "Više za kožu",
        paragraphs: [],
        images: [],
        ctas: {
          primary: { text: "", href: "" },
          secondary: { text: "", href: "" },
        },
      },
      audiencePaths: {
        enabled: true,
        eyebrow: "Kome je namenjeno",
        headline: "Odaberi svoj put",
        lead: "Dva pravca, isti stručni pristup.",
        paths: [
          {
            id: "client",
            chip: "Za tebe",
            title: "Lična konsultacija",
            lead: "Plan prilagođen tvojoj koži.",
            bullets: ["Procena", "Plan"],
            href: "/za-klijente",
            ctaLabel: "Za klijente",
            tone: "surface",
          },
        ],
      },
      topicHub: {
        enabled: true,
        eyebrow: "Teme",
        headline: "Znanje koje možeš da primeniš",
        filters: [{ id: "care", label: "Nega" }],
        topics: [
          {
            id: "spf",
            group: "care",
            title: "SPF",
            lead: "Svakodnevna zaštita.",
            tags: ["zaštita"],
            href: "/blog/spf",
          },
        ],
      },
      guidedCareProcess: {
        enabled: true,
        eyebrow: "Proces",
        headline: "Vođena nega",
        lead: "Od procene do praćenja.",
        steps: [{ title: "Procena", text: "Razgovor i analiza." }],
      },
      credentials: {
        enabled: true,
        eyebrow: "Stručnost",
        headline: "Zašto ovaj pristup",
        lead: "Znanje potvrđeno praksom.",
        pillars: [{ title: "Obrazovanje", text: "Kontinuirano usavršavanje." }],
        social: {
          label: "Instagram",
          title: "Prati edukaciju",
          linkLabel: "Otvori profil",
          url: "https://instagram.com/expert",
          images: [{ src: "/social.jpg", alt: "Objava" }],
        },
        note: "Informativni sadržaj.",
      },
      finalCta: {
        enabled: true,
        eyebrow: "Sledeći korak",
        headline: "Zakaži razgovor",
        lead: "Izaberi termin za upoznavanje.",
        calendar: {
          label: "Dostupnost",
          month: "Septembar",
          slots: [{ day: "12", time: "10:00", selected: false }],
        },
        ctaLabel: "Pokreni prijavu",
        note: "Prikaz termina je informativan.",
      },
      featuredEducation: {
        enabled: true,
        eyebrow: "Edukacija",
        status: "U pripremi",
        headline: "Program za negu kože",
        lead: "Strukturisan program.",
        learn: ["Procena kože"],
        details: { format: "Online", duration: "6 nedelja", price: "Uskoro" },
        pendingLabel: "Lista čekanja",
        cta: { text: "Prijavi interesovanje", href: "/za-profesionalce" },
        note: "Detalji se potvrđuju.",
      },
      professionalPath: {
        enabled: true,
        eyebrow: "Za profesionalce",
        headline: "Razvoj tima",
        lead: "Programi za salone.",
        note: "Ponuda se pravi po meri.",
        formats: [
          {
            kind: "team",
            title: "Radionica",
            text: "Praktičan rad.",
            priceFrom: "na upit",
          },
        ],
        cta: { text: "Pošalji upit", href: "/za-profesionalce" },
      },
    },
    pages: {
      servicesPage: {
        headline: "Programi",
        subheadline: "Izaberi format",
        paragraph: "Sadržaj po meri.",
      },
      appointmentsPage: {
        headline: "Konsultacije",
        subheadline: "Odaberi termin",
        paragraph: "Kratak uvodni razgovor.",
        ctas: {
          primary: { text: "Nastavi", href: "/termini" },
          secondary: { text: "Nazad", href: "/" },
        },
      },
    },
  };
}

const themePages: TenantThemePages = {
  "za-klijente": {
    enabled: true,
    hero: { eyebrow: "Klijenti", headline: "Lična podrška" },
  },
};

const bookingPreview: ThemeBookingPreview = {
  enabled: true,
  offerings: [{ id: "consultation", title: "Konsultacija" }],
  dates: [{ id: "2026-09-12", dow: "Sub", day: "12", long: "12. septembar" }],
  times: ["10:00"],
  intake: [],
  checkin: [],
};

describe("Theme-9 SalonProfile content preservation", () => {
  it("čuvanje samo radnog vremena zadržava svih sedam sekcija i hero/about dodatke", () => {
    const stored = theme9Fixture();
    const payload = mapLandingStructureForAdmin(stored);
    const saved = mergeLandingStructureUpdate(stored, payload);

    expect(saved.landing.hero.eyebrow).toBe(stored.landing.hero.eyebrow);
    expect(saved.landing.hero.quote).toBe(stored.landing.hero.quote);
    expect(saved.landing.about.credentials).toEqual(stored.landing.about.credentials);
    expect(saved.landing.about.showCredentials).toBe(false);
    expect(saved.landing.about.badge).toEqual(stored.landing.about.badge);
    expect(saved.landing.audiencePaths).toEqual(stored.landing.audiencePaths);
    expect(saved.landing.topicHub).toEqual(stored.landing.topicHub);
    expect(saved.landing.guidedCareProcess).toEqual(stored.landing.guidedCareProcess);
    expect(saved.landing.credentials).toEqual(stored.landing.credentials);
    expect(saved.landing.featuredEducation).toEqual(stored.landing.featuredEducation);
    expect(saved.landing.professionalPath).toEqual(stored.landing.professionalPath);
    expect(saved.landing.finalCta).toEqual(stored.landing.finalCta);
  });

  it("čuvanje samo SEO podataka ne menja themePages ni privremeni booking prikaz", () => {
    const profileContent = {
      landingStructure: theme9Fixture(),
      themePages,
      themeBookingPreview: bookingPreview,
    };
    const saved = {
      ...profileContent,
      landingStructure: mergeLandingStructureUpdate(
        profileContent.landingStructure,
        mapLandingStructureForAdmin(profileContent.landingStructure),
      ),
    };

    expect(saved.themePages).toEqual(themePages);
    expect(saved.themeBookingPreview).toEqual(bookingPreview);
    expect(saved.landingStructure.landing.finalCta).toEqual(
      profileContent.landingStructure.landing.finalCta,
    );
  });

  it("serverska zaštita dopunjava nepotpun stari payload bez brisanja Theme-9 sadržaja", () => {
    const stored = theme9Fixture();
    const oldAdminPayload = mapLandingStructureForAdmin(undefined);
    const saved = mergeLandingStructureUpdate(stored, oldAdminPayload);

    expect(saved.landing.hero.eyebrow).toBe(stored.landing.hero.eyebrow);
    expect(saved.landing.hero.quote).toBe(stored.landing.hero.quote);
    expect(saved.landing.about.badge).toEqual(stored.landing.about.badge);
    expect(saved.landing.audiencePaths).toEqual(stored.landing.audiencePaths);
    expect(saved.landing.finalCta).toEqual(stored.landing.finalCta);
  });

  it("mapper prenosi i buduće CMS polje koje još nije deo TypeScript ugovora", () => {
    const stored = theme9Fixture();
    const landingWithFutureField = stored.landing as LandingStructure["landing"] & {
      futureEditorialPanel: { enabled: boolean; copy: string };
    };
    landingWithFutureField.futureEditorialPanel = {
      enabled: true,
      copy: "Budući sadržaj",
    };

    const mapped = mapLandingStructureForAdmin(stored);
    const mappedLanding = mapped.landing as LandingStructure["landing"] & {
      futureEditorialPanel?: { enabled: boolean; copy: string };
    };

    expect(mappedLanding.futureEditorialPanel).toEqual(
      landingWithFutureField.futureEditorialPanel,
    );
  });

  it("namerno poslati false, prazan tekst i prazna lista prepisuju stare vrednosti", () => {
    const stored = theme9Fixture();
    const payload = mapLandingStructureForAdmin(stored);
    payload.landing.audiencePaths = {
      ...payload.landing.audiencePaths,
      enabled: false,
      headline: "",
      paths: [],
    };
    payload.landing.about = {
      ...payload.landing.about,
      showCredentials: false,
      credentials: [],
    };

    const saved = mergeLandingStructureUpdate(stored, payload);

    expect(saved.landing.audiencePaths?.enabled).toBe(false);
    expect(saved.landing.audiencePaths?.headline).toBe("");
    expect(saved.landing.audiencePaths?.paths).toEqual([]);
    expect(saved.landing.about.showCredentials).toBe(false);
    expect(saved.landing.about.credentials).toEqual([]);
  });

  it.each(["theme-1", "theme-2", "theme-7", "theme-8"])(
    "%s zadržava postojeća legacy polja",
    (theme) => {
      const stored = theme9Fixture();
      stored.landing.hero.theme8 = {
        eyebrow: `${theme}-eyebrow`,
        marquee: ["CLASSIC", "VOLUME"],
      };
      stored.landing.gallery.treatments = [
        {
          id: theme,
          category: "Nega",
          title: "Tretman",
          description: "Opis",
          images: [{ src: "/treatment.jpg", alt: "Tretman" }],
          href: "/termini",
        },
      ];
      stored.landing.perks = {
        enabled: true,
        eyebrow: "Pogodnosti",
        headline: "Nagrade",
        paragraphs: ["Legacy Theme-8 sadržaj"],
      };

      const mapped = mapLandingStructureForAdmin(stored);

      expect(mapped.landing.hero.theme8).toEqual(stored.landing.hero.theme8);
      expect(mapped.landing.gallery.treatments).toEqual(
        stored.landing.gallery.treatments,
      );
      expect(mapped.landing.perks?.paragraphs).toEqual(
        stored.landing.perks.paragraphs,
      );
      expect(mapped.pages).toEqual(stored.pages);
    },
  );
});
