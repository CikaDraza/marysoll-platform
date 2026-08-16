/**
 * Validacija ThemeDocument-a protiv LayoutDefinition-a.
 *
 * Dva režima (spec 5.1):
 *   - "render"  → tolerantan: nepoznat blok se preskače, ne obara stranu
 *   - "publish" → strog: nepoznat tip/schemaVersion je greška
 */

import type {
  BlockTypeResolver,
  LayoutDefinition,
  LayoutBlock,
  SectionVariantDefinition,
  ThemeDocument,
  ValidationIssue,
  ValidationResult,
} from "./types.js";

export const DEFAULT_VARIANT = "default";

export type ValidationMode = "render" | "publish";

export interface ValidateOptions {
  mode: ValidationMode;
  /** Bez njega se tip bloka ne proverava (engine nema registry). */
  resolver?: BlockTypeResolver;
}

function findVariant(
  layout: LayoutDefinition,
  sectionType: string,
  variant: string,
): SectionVariantDefinition | undefined {
  const section = layout.sections.find((s) => s.sectionType === sectionType);
  return section?.variants[variant];
}

export function validateThemeDocument(
  doc: ThemeDocument,
  layout: LayoutDefinition,
  options: ValidateOptions,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const add = (
    code: ValidationIssue["code"],
    message: string,
    path?: string,
  ) => {
    issues.push({ code, message, path });
  };

  if (!Number.isInteger(doc.version) || doc.version < 1) {
    add("invalid_version", `version mora biti ceo broj >= 1 (dobijeno: ${doc.version})`);
  }

  if (doc.layoutDefinitionId !== layout.id) {
    add(
      "unknown_layout_definition",
      `dokument traži layout "${doc.layoutDefinitionId}", a prosleđen je "${layout.id}"`,
    );
    // Bez odgovarajuće definicije nema smisla proveravati slotove.
    return { ok: false, issues };
  }

  const seenSectionIds = new Set<string>();
  const seenBlockIds = new Set<string>();

  doc.sections.forEach((section, si) => {
    const sectionPath = `sections[${si}]`;

    if (seenSectionIds.has(section.id)) {
      add("duplicate_section_id", `sekcija "${section.id}" se ponavlja`, sectionPath);
    }
    seenSectionIds.add(section.id);

    const variantName = section.variant ?? DEFAULT_VARIANT;
    const variant = findVariant(layout, section.sectionType, variantName);

    if (!layout.sections.some((s) => s.sectionType === section.sectionType)) {
      add(
        "unknown_section_type",
        `nepoznat sectionType "${section.sectionType}"`,
        sectionPath,
      );
      return;
    }
    if (!variant) {
      add(
        "unknown_variant",
        `sekcija "${section.sectionType}" nema varijantu "${variantName}"`,
        sectionPath,
      );
      return;
    }

    const perSlotCount = new Map<string, number>();

    section.blocks.forEach((block, bi) => {
      const blockPath = `${sectionPath}.blocks[${bi}]`;

      if (seenBlockIds.has(block.id)) {
        add("duplicate_block_id", `blok "${block.id}" se ponavlja`, blockPath);
      }
      seenBlockIds.add(block.id);

      const slot = variant.slots.find((s) => s.name === block.slot);
      if (!slot) {
        add(
          "unknown_slot",
          `slot "${block.slot}" ne postoji u "${section.sectionType}/${variantName}"`,
          blockPath,
        );
        return;
      }

      const count = (perSlotCount.get(slot.name) ?? 0) + 1;
      perSlotCount.set(slot.name, count);
      if (slot.maxBlocks != null && count > slot.maxBlocks) {
        add(
          "slot_over_capacity",
          `slot "${slot.name}" prima najviše ${slot.maxBlocks} blok(ova)`,
          blockPath,
        );
      }

      if (
        slot.accepts &&
        slot.accepts !== "any" &&
        !slot.accepts.includes(block.type)
      ) {
        add(
          "block_type_not_accepted",
          `slot "${slot.name}" ne prima blok tipa "${block.type}"`,
          blockPath,
        );
      }

      // Nepoznat tip / schemaVersion: greška samo na publish-u (spec 5.1).
      if (options.mode === "publish" && options.resolver) {
        if (!options.resolver.isKnownType(block.type)) {
          add("unknown_block_type", `nepoznat tip bloka "${block.type}"`, blockPath);
        } else if (
          !options.resolver.supportsSchemaVersion(block.type, block.schemaVersion)
        ) {
          add(
            "unsupported_schema_version",
            `blok "${block.type}" ne podržava schemaVersion ${block.schemaVersion}`,
            blockPath,
          );
        }
      }
    });
  });

  return { ok: issues.length === 0, issues };
}

/**
 * Blokovi koje treba renderovati: nepoznat tip ili nepodržan schemaVersion se
 * PRESKAČE (nikad ne obara stranu), uz izveštaj za telemetriju.
 */
export function selectRenderableBlocks(
  doc: ThemeDocument,
  resolver: BlockTypeResolver,
): { blocks: LayoutBlock[]; skipped: { block: LayoutBlock; reason: string }[] } {
  const blocks: LayoutBlock[] = [];
  const skipped: { block: LayoutBlock; reason: string }[] = [];

  for (const section of doc.sections) {
    for (const block of section.blocks) {
      if (!resolver.isKnownType(block.type)) {
        skipped.push({ block, reason: "unknown_block_type" });
        continue;
      }
      if (!resolver.supportsSchemaVersion(block.type, block.schemaVersion)) {
        skipped.push({ block, reason: "unsupported_schema_version" });
        continue;
      }
      blocks.push(block);
    }
  }

  return { blocks, skipped };
}
