/**
 * Lifecycle i invarijante objavljivanja (spec 4.2).
 *
 *   draft  ──publish──▶ published ──(nova izmena)──▶ draft(version+1)
 *   draft  ──preview──▶ preview
 *   published ──archive──▶ archived        (immutable, kraj puta)
 *
 * Ključne invarijante:
 *   - published i archived revizije se NIKAD ne menjaju u mestu;
 *   - publish je atomska zamena aktivne revizije (stara → archived);
 *   - version je monotono rastuć.
 */

import type { ThemeDocument, ThemeLifecycle, ValidationResult } from "./types.js";

const ALLOWED_TRANSITIONS: Record<ThemeLifecycle, ThemeLifecycle[]> = {
  draft: ["preview", "published"],
  preview: ["draft", "published"],
  published: ["archived"],
  archived: [],
};

export function canTransition(
  from: ThemeLifecycle,
  to: ThemeLifecycle,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: ThemeLifecycle,
  to: ThemeLifecycle,
): ValidationResult {
  if (canTransition(from, to)) return { ok: true, issues: [] };
  return {
    ok: false,
    issues: [
      {
        code: "illegal_lifecycle_transition",
        message: `prelaz "${from}" → "${to}" nije dozvoljen`,
      },
    ],
  };
}

export function isImmutable(lifecycle: ThemeLifecycle): boolean {
  return lifecycle === "published" || lifecycle === "archived";
}

/** Izmena objavljene teme = nova draft revizija, original ostaje netaknut. */
export function deriveDraftFrom(doc: ThemeDocument): ThemeDocument {
  return {
    ...doc,
    version: doc.version + 1,
    lifecycle: "draft",
    sections: doc.sections.map((s) => ({
      ...s,
      blocks: s.blocks.map((b) => ({ ...b })),
    })),
  };
}

export interface PublishResult {
  ok: boolean;
  issues: ValidationResult["issues"];
  /** Nova aktivna revizija. */
  published?: ThemeDocument;
  /** Prethodna aktivna revizija, prebačena u archived. */
  archived?: ThemeDocument;
}

/**
 * Atomska zamena aktivne revizije. Vraća OBE nove vrednosti da ih adapter upiše
 * u jednoj transakciji — posetilac nikad ne sme da vidi polustanje.
 */
export function publishRevision(
  candidate: ThemeDocument,
  currentPublished?: ThemeDocument,
): PublishResult {
  const transition = assertTransition(candidate.lifecycle, "published");
  if (!transition.ok) return { ok: false, issues: transition.issues };

  if (currentPublished && candidate.version <= currentPublished.version) {
    return {
      ok: false,
      issues: [
        {
          code: "invalid_version",
          message: `nova revizija (v${candidate.version}) mora biti veća od aktivne (v${currentPublished.version})`,
        },
      ],
    };
  }

  return {
    ok: true,
    issues: [],
    published: { ...candidate, lifecycle: "published" },
    archived: currentPublished
      ? { ...currentPublished, lifecycle: "archived" }
      : undefined,
  };
}
