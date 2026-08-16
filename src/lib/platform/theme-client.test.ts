/**
 * Adapter regresija nad STVARNIM landingStructure zapisima.
 *
 * Fixture `__fixtures__/landing-structures.json` je snimak sva četiri
 * produkciona tenanta (2026-08-16); redagovani su samo lični kontakti
 * (telefon/email), struktura je netaknuta.
 *
 * Cilj: dokazati da `landingStructureToThemeDocument` daje TAČNO isti skup
 * vidljivih sekcija kao zatečeni flagovi u ThemeLayout-u. To je uslov za
 * "isti proizvod pre i posle T2A".
 */
import { describe, expect, it } from "vitest";
import { validateThemeDocument } from "@panta/theme-engine";
import {
  LANDING_LAYOUT_DEFINITION,
  enabledSectionKeys,
  isSectionEnabled,
  landingStructureToThemeDocument,
  resolveGalleryVariant,
} from "./theme-client";
import type { LandingStructure } from "@/types";
import fixtures from "./__fixtures__/landing-structures.json";

const tenants = Object.entries(
  fixtures as unknown as Record<string, LandingStructure>,
);

/** Doslovna kopija flag logike iz ThemeLayout.tsx (l. 89–99) — referentna istina. */
function legacyFlags(ls: LandingStructure | undefined) {
  return {
    hero: ls?.landing?.hero?.enabled ?? true,
    about: ls?.landing?.about?.enabled ?? true,
    artists: ls?.landing?.artists?.enabled ?? true,
    servicesPreview: ls?.landing?.servicesPreview?.enabled ?? true,
    appointmentSection: ls?.landing?.appointmentSection?.enabled ?? true,
    testimonials: ls?.landing?.testimonials?.enabled ?? true,
    gallery: ls?.landing?.gallery?.enabled ?? true,
    faq: ls?.landing?.faq?.enabled ?? true,
    blog: ls?.landing?.blog?.enabled ?? false,
    perks: ls?.landing?.perks?.enabled ?? false,
  };
}

describe("fixture zdravlje", () => {
  it("sadrži sva četiri tenanta sa punom landing strukturom", () => {
    expect(tenants).toHaveLength(4);
    for (const [slug, ls] of tenants) {
      expect(Object.keys(ls.landing), slug).toHaveLength(10);
    }
  });

  it("nema ličnih kontakata u snimku", () => {
    const raw = JSON.stringify(fixtures);
    const emails = raw.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [];
    expect(emails.every((e) => e === "kontakt@example.com")).toBe(true);
  });
});

describe.each(tenants)("adapter nad stvarnim podacima — %s", (slug, ls) => {
  const doc = landingStructureToThemeDocument(ls, { theme: "theme-1" });

  it("proizvodi dokument koji prolazi validaciju engine-a", () => {
    const res = validateThemeDocument(doc, LANDING_LAYOUT_DEFINITION, {
      mode: "render",
    });
    expect(res.issues, `${slug}: ${JSON.stringify(res.issues)}`).toEqual([]);
    expect(res.ok).toBe(true);
  });

  it("vidljive sekcije se poklapaju sa zatečenim flagovima 1:1", () => {
    const legacy = legacyFlags(ls);
    const expected = Object.entries(legacy)
      .filter(([, on]) => on)
      .map(([key]) => key);

    expect(enabledSectionKeys(doc).sort()).toEqual(expected.sort());
  });

  it("isključena sekcija nema blok u dokumentu", () => {
    const legacy = legacyFlags(ls);
    const disabled = Object.entries(legacy)
      .filter(([, on]) => !on)
      .map(([key]) => key);

    for (const key of disabled) {
      expect(doc.sections.find((s) => s.id === key), `${slug}/${key}`).toBeUndefined();
    }
  });

  it("svaki blok ima tačno jedan slot 'main' i schemaVersion 1", () => {
    for (const section of doc.sections) {
      expect(section.blocks).toHaveLength(1);
      expect(section.blocks[0].slot).toBe("main");
      expect(section.blocks[0].schemaVersion).toBe(1);
    }
  });

  it("gallery blok nosi razrešenu varijantu", () => {
    const gallery = doc.sections.find((s) => s.id === "gallery");
    if (!gallery) return;
    const config = gallery.blocks[0].config as { galleryVariant?: string };
    expect(config.galleryVariant).toBe(resolveGalleryVariant(ls, "theme-1"));
  });

  it("redosled sekcija je stabilan (isti kao na današnjoj strani)", () => {
    const order = doc.sections.map((s) => s.id);
    expect(order).toEqual([...order].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)));
  });
});

const ORDER = [
  "hero",
  "about",
  "artists",
  "servicesPreview",
  "appointmentSection",
  "testimonials",
  "gallery",
  "faq",
  "blog",
  "perks",
];

describe("konkretni produkcioni slučajevi", () => {
  const byslug = Object.fromEntries(tenants);

  it("The LASH ROOM ima isključen appointmentSection → nema booking.services blok", () => {
    const ls = byslug["the-lash-room-by-anja"];
    expect(ls.landing.appointmentSection.enabled).toBe(false);
    const doc = landingStructureToThemeDocument(ls, { theme: "theme-7" });
    const types = doc.sections.flatMap((s) => s.blocks.map((b) => b.type));
    expect(types).not.toContain("booking.services");
    expect(types).toContain("services.catalog");
  });

  it("Shi Sham ima uključene artists → content.team blok postoji", () => {
    const ls = byslug["shisham-frizerski-salon"];
    expect(ls.landing.artists.enabled).toBe(true);
    const doc = landingStructureToThemeDocument(ls);
    expect(doc.sections.flatMap((s) => s.blocks.map((b) => b.type))).toContain(
      "content.team",
    );
  });

  it("Kiki Kiss ima isključene testimonials → nema tog bloka", () => {
    const ls = byslug["kiki-kiss-beauty"];
    expect(ls.landing.testimonials.enabled).toBe(false);
    const doc = landingStructureToThemeDocument(ls);
    expect(doc.sections.map((s) => s.id)).not.toContain("testimonials");
  });

  it("nijedan tenant nema blog/perks — oni su default false", () => {
    for (const [slug, ls] of tenants) {
      const doc = landingStructureToThemeDocument(ls);
      expect(doc.sections.map((s) => s.id), slug).not.toContain("blog");
      expect(doc.sections.map((s) => s.id), slug).not.toContain("perks");
    }
  });
});

describe("granični slučajevi bez CMS podataka", () => {
  it("prazan landingStructure daje podrazumevani skup (bez blog/perks)", () => {
    const doc = landingStructureToThemeDocument(undefined);
    expect(enabledSectionKeys(doc)).toEqual([
      "hero",
      "about",
      "artists",
      "servicesPreview",
      "appointmentSection",
      "testimonials",
      "gallery",
      "faq",
    ]);
    expect(
      validateThemeDocument(doc, LANDING_LAYOUT_DEFINITION, { mode: "render" }).ok,
    ).toBe(true);
  });

  it("isSectionEnabled poštuje default false za blog i perks", () => {
    expect(isSectionEnabled(undefined, "blog")).toBe(false);
    expect(isSectionEnabled(undefined, "perks")).toBe(false);
    expect(isSectionEnabled(undefined, "hero")).toBe(true);
  });

  it("gallery varijanta pada na temu kad CMS nema override", () => {
    const ls = { landing: { gallery: { enabled: true } } } as unknown as LandingStructure;
    expect(resolveGalleryVariant(ls, "theme-3")).toBe("images-only");
    expect(resolveGalleryVariant(ls, "theme-8")).toBe("images-with-category");
    expect(resolveGalleryVariant(ls, undefined)).toBe("images-only");
  });
});
