import type { LandingStructure, TenantThemePage, TenantThemePages } from "@/types";
import { hasMeaningfulContent } from "./sectionNormalization";

const careImage = {
  src: "/images/theme-9/starter/care.svg",
  alt: "Ilustracija proizvoda za negu i lista biljke",
};
const learningImage = {
  src: "/images/theme-9/starter/learning.svg",
  alt: "Ilustracija otvorene knjige i beležnice",
};

/** Starter is persisted once at theme selection, never a public render fallback. */
export function createTheme9Starter(
  name: string,
  current?: LandingStructure,
  currentPages?: TenantThemePages,
): { landingStructure: LandingStructure; themePages: TenantThemePages } {
  const sections = {
    hero: {
      enabled: true,
      eyebrow: "Nega i edukacija",
      headline: name || "Vaš prostor za negu i edukaciju",
      subheadline: "Upoznajte naš pristup, istražite sadržaje i pronađite podršku za svoje sledeće korake.",
      whereWhatForWhom: "Nega · Znanje · Individualni pristup",
      contact: {},
      image: careImage,
      ctas: {
        primary: { text: "Zakaži konsultaciju", href: "#kontakt" },
        secondary: { text: "Upoznajte naš pristup", href: "#o-meni" },
      },
    },
    about: {
      enabled: true,
      eyebrow: "O nama",
      headline: "Znanje koje možete primeniti",
      paragraphs: ["Predstavite ovde svoj tim, iskustvo i način rada. Objasnite kome je vaša podrška namenjena i šta posetioci mogu da očekuju."],
      image: learningImage,
      badge: { name, role: "Nega i edukacija" },
    },
    audiencePaths: {
      enabled: true,
      eyebrow: "Odaberite svoj put",
      headline: "Podrška za vaše potrebe",
      paths: [
        { id: "clients", title: "Za klijente", lead: "Upoznajte naš pristup individualnoj nezi.", href: "/za-klijente", ctaLabel: "Saznajte više", tone: "surface" },
        { id: "professionals", title: "Za profesionalce", lead: "Predstavite edukacije i prilike za stručno usavršavanje.", href: "/za-profesionalce", ctaLabel: "Istražite pristup", tone: "accent" },
      ],
    },
    guidedCareProcess: {
      enabled: true,
      eyebrow: "Način rada",
      headline: "Od pitanja do jasnog plana",
      steps: [
        { title: "Upoznavanje", text: "Razgovaramo o vašim potrebama i ciljevima." },
        { title: "Dogovor", text: "Biramo sledeće korake i način saradnje." },
        { title: "Praćenje", text: "Pratimo napredak i prilagođavamo plan." },
      ],
    },
    professionalPath: {
      enabled: true,
      eyebrow: "Profesionalni razvoj",
      headline: "Prostor za novo znanje",
      lead: "Predstavite teme, formate i kome su vaše edukacije namenjene.",
      formats: [{ kind: "individual", title: "Individualni pristup", text: "Opišite kako prilagođavate sadržaj potrebama polaznika." }],
      cta: { text: "Saznajte više", href: "/za-profesionalce" },
    },
    finalCta: {
      enabled: true,
      eyebrow: "Kontakt",
      headline: "Hajde da razgovaramo o vašim ciljevima",
      lead: "Javite nam se za informacije o našem pristupu i mogućnostima saradnje.",
      ctaLabel: "Zakaži konsultaciju",
      note: "Detalje i termin dogovaramo nakon vašeg upita.",
    },
  } satisfies Partial<LandingStructure["landing"]>;

  const landing = { ...current?.landing };
  for (const key of Object.keys(sections) as (keyof typeof sections)[]) {
    const existing = landing[key];
    // An explicit OFF and any authored content always survive selection.
    const authored = key === "about" && existing
      ? { ...existing, showCredentials: undefined }
      : existing;
    if (existing?.enabled === false || hasMeaningfulContent(authored)) continue;
    Object.assign(landing, { [key]: structuredClone(sections[key]) });
  }

  const page = (professional: boolean): TenantThemePage => ({
    enabled: true,
    hero: {
      eyebrow: name,
      headline: professional ? "Znanje za vaš profesionalni razvoj" : "Podrška za vašu svakodnevnu negu",
      lead: "Ovo je početni tekst. Prilagodite ga svom pristupu i ponudi u uređivaču sadržaja.",
      image: professional ? learningImage : careImage,
    },
    steps: {
      heading: { headline: "Kako započeti" },
      items: [
        { title: "Upoznajte naš pristup", text: "Pročitajte više o načinu rada." },
        { title: "Javite nam se", text: "Kontaktirajte nas da dogovorimo naredne korake." },
      ],
    },
  });
  const themePages = { ...currentPages };
  for (const key of ["za-klijente", "za-profesionalce"] as const) {
    const existing = themePages[key];
    if (existing?.enabled === false || hasMeaningfulContent(existing)) continue;
    themePages[key] = page(key === "za-profesionalce");
  }

  return {
    landingStructure: { ...current, landing } as LandingStructure,
    themePages,
  };
}
