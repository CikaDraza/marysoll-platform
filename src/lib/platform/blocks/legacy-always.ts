/**
 * lib/platform/blocks/legacy-always.ts
 *
 * ⚠️ PRIVREMENI COMPATIBILITY SLOJ — migration debt, ne sposobnost sistema.
 *
 * Tri teme danas renderuju neke CMS sekcije BEZ obzira na `enabled` flag
 * (inventar 6.1): theme-2 (hero/about/servicesPreview/testimonials), theme-5
 * (hero/servicesPreview/appointmentSection/about/gallery) i theme-7
 * (appointmentSection, jer je booking slot unutar hero sekcije).
 *
 * T2A je extraction, ne behavior change: ako bi migracija na registry počela da
 * poštuje te flagove, sekcija bi kod stvarnog tenanta nestala sa sajta. Zato
 * compat putanja postoji — ali izolovano, da se briše jednim potezom.
 *
 * PRAVILA:
 *   1. Allowlist se NE piše ručno — izvodi se iz Composition Inventara. Kad tema
 *      počne da poštuje flag, inventar se menja i compat nestaje sam.
 *   2. Compat blok koristi ISTI konstruktor (`buildSectionBlock`), pa ima isti
 *      `type`, `schemaVersion` i `config` kao normalan blok → isti registry,
 *      isti loader, isti renderer. Zaobilazi se samo provera postojanja u
 *      `ThemeDocument`-u.
 *   3. Ništa odavde ne sme da procuri u @panta/theme-engine ni u registry.
 *
 * IZLAZ: T2A-FOLLOWUP „CMS Visibility Semantics Normalization" — po tenantu se
 * odlučuje da li je `enabled: false` bio stale podatak (→ postavi true, gating
 * ostaje) ili stvarna namera (→ sekcija svesno nestaje). Tek tada se ovaj fajl
 * i `LegacyAlwaysThemeBlock` brišu.
 */

import type { LayoutBlock, ThemeDocument } from "@panta/theme-engine";
import type { LandingStructure } from "@/types";
import {
  SECTION_ORDER,
  buildSectionBlock,
  sectionBlockId,
  type LandingSectionKey,
} from "../theme-client";
import { unconditionalCmsBlocks } from "../theme-composition";

const KNOWN_SECTION_KEYS = new Set<string>(SECTION_ORDER);

/**
 * CMS sekcije koje tema renderuje bezuslovno — jedina dozvoljena upotreba
 * compat putanje. Izvor je inventar; ovde se samo proverava da je `source`
 * stvarno CMS sekcija (da inventar ne uvede blok koji adapter ne poznaje).
 */
export function legacyAlwaysSources(theme: string): LandingSectionKey[] {
  return unconditionalCmsBlocks(theme).filter((source): source is LandingSectionKey =>
    KNOWN_SECTION_KEYS.has(source),
  );
}

/** Guard za `LegacyAlwaysThemeBlock` — par (tema, sekcija) mora biti u inventaru. */
export function isLegacyAlwaysAllowed(
  theme: string,
  source: string,
): source is LandingSectionKey {
  return (legacyAlwaysSources(theme) as string[]).includes(source);
}

/**
 * Blokovi koje treba učitati iako ih nema u dokumentu (sekcija je `enabled:
 * false`, a tema je ipak renderuje). Compat mora da postoji i na putanji
 * podataka, ne samo na putanji renderovanja — inače bi bezuslovna sekcija
 * ostala prazna.
 */
export function legacyAlwaysBlocks(
  theme: string,
  document: ThemeDocument,
  ls: LandingStructure | undefined,
): LayoutBlock[] {
  const inDocument = new Set(
    document.sections.flatMap((section) => section.blocks.map((b) => b.id)),
  );

  return legacyAlwaysSources(theme)
    .filter((source) => !inDocument.has(sectionBlockId(source)))
    .map((source) => buildSectionBlock(ls, source, { theme }));
}
