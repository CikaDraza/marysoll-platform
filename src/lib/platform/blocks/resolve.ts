/**
 * lib/platform/blocks/resolve.ts — server prolaz kroz blokove.
 *
 * Uzme dokument, izabere renderabilne blokove, provali config kroz shemu i
 * izvrši SVE loadere PARALELNO nad request-scoped izvorom podataka
 * (spec 5.2 — zabranjen waterfall).
 *
 * Nijedan problem sa blokom ne obara stranu (spec 5.1): nepoznat tip, nepodržan
 * `schemaVersion`, neispravan config ili pukao loader → blok se preskoči i
 * prijavi telemetriji. Strogost živi na publish-u, ne na renderu.
 *
 * `extraBlocks` je generičan otvor za blokove koje dokument ne sadrži. Ovaj
 * modul ne zna zašto bi takav blok postojao — to zna pozivalac
 * (`theme-render.ts`, jedini koji danas koristi otvor).
 */

import {
  selectRenderableBlocks,
  type LayoutBlock,
  type ThemeDocument,
} from "@panta/theme-engine";
import { FEATURE_BLOCK_REGISTRY, type FeatureBlockRegistry } from "./registry";
import type {
  BlockSkipReason,
  BlockTelemetry,
  ResolvedBlock,
  ResolvedBlockMap,
} from "./render-types";
import type { BlockDataSource, FeatureBlockType } from "./types";

/** Blok van dokumenta + oznaka odakle je došao (ide u `ResolvedBlock.origin`). */
export interface ExtraBlock {
  block: LayoutBlock;
  origin: string;
}

export interface ResolveBlockDataOptions {
  document: ThemeDocument;
  theme: string;
  deps: BlockDataSource;
  tenantSlug?: string;
  extraBlocks?: ExtraBlock[];
  registry?: FeatureBlockRegistry;
  telemetry?: BlockTelemetry;
}

const defaultTelemetry: BlockTelemetry = (event) => {
  console.warn(
    `[blocks] preskočen blok "${event.type}" (${event.reason})` +
      `${event.blockId ? ` id=${event.blockId}` : ""} tema=${event.theme}` +
      `${event.detail ? ` — ${event.detail}` : ""}`,
  );
};

export async function resolveBlockData({
  document,
  theme,
  deps,
  tenantSlug,
  extraBlocks = [],
  registry = FEATURE_BLOCK_REGISTRY,
  telemetry = defaultTelemetry,
}: ResolveBlockDataOptions): Promise<ResolvedBlockMap> {
  const { blocks, skipped } = selectRenderableBlocks(document, registry);

  for (const s of skipped) {
    telemetry({
      reason:
        s.reason === "unsupported_schema_version"
          ? "unsupported_schema_version"
          : "unknown_block_type",
      type: s.block.type,
      blockId: s.block.id,
      theme,
    });
  }

  const pending: ExtraBlock[] = [
    ...blocks.map((block) => ({ block, origin: "" })),
    ...extraBlocks,
  ];

  const resolved = await Promise.all(
    pending.map(({ block, origin }) => loadOne(block, origin)),
  );

  const map: ResolvedBlockMap = {};
  for (const entry of resolved) {
    if (entry) map[entry.id] = entry;
  }
  return map;

  function skip(
    reason: BlockSkipReason,
    block: LayoutBlock,
    detail?: string,
  ): undefined {
    telemetry({ reason, type: block.type, blockId: block.id, theme, detail });
    return undefined;
  }

  async function loadOne(
    block: LayoutBlock,
    origin: string,
  ): Promise<ResolvedBlock | undefined> {
    const definition = registry.get(block.type);
    if (!definition) return skip("unknown_block_type", block);

    if (!definition.schemaVersions.includes(block.schemaVersion)) {
      return skip(
        "unsupported_schema_version",
        block,
        `schemaVersion=${block.schemaVersion}`,
      );
    }

    const parsed = definition.parseConfig(block.config);
    if (!parsed.ok || parsed.value === undefined) {
      return skip("invalid_config", block, parsed.error);
    }

    try {
      const data = await definition.load({
        theme,
        tenantSlug,
        config: parsed.value,
        deps,
      });
      return {
        id: block.id,
        type: block.type as FeatureBlockType,
        schemaVersion: block.schemaVersion,
        config: parsed.value,
        data,
        ...(origin ? { origin } : {}),
      } as ResolvedBlock;
    } catch (error) {
      return skip(
        "loader_failed",
        block,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
