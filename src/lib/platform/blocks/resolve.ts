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
import type {
  CapabilityReadiness,
  TenantCapability,
  TenantCapabilitySnapshot,
} from "@/types/tenant-capabilities";

export interface ResolveBlockDataOptions {
  document: ThemeDocument;
  theme: string;
  deps: BlockDataSource;
  tenantSlug?: string;
  registry?: FeatureBlockRegistry;
  telemetry?: BlockTelemetry;
  /** Server-side capability snapshot konkretnog public tenanta. */
  capabilities?: TenantCapabilitySnapshot;
  /** Domen kasnije priključuje stvarni readiness provider; T2B ga ne izmišlja. */
  readiness?: CapabilityReadinessProvider;
  onDiagnostic?: BlockReadinessDiagnostic;
}

export interface CapabilityReadinessProvider {
  resolve(input: {
    capability: TenantCapability;
    blockId: string;
    type: FeatureBlockType;
  }): Promise<CapabilityReadiness> | CapabilityReadiness;
}

export type BlockReadinessDiagnostic = (event: {
  capability: TenantCapability;
  blockId: string;
  type: FeatureBlockType;
  readiness: "degraded";
}) => void;

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
  registry = FEATURE_BLOCK_REGISTRY,
  telemetry = defaultTelemetry,
  capabilities,
  readiness,
  onDiagnostic,
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

  const resolved = await Promise.all(blocks.map((block) => loadOne(block)));

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

  async function loadOne(block: LayoutBlock): Promise<ResolvedBlock | undefined> {
    const definition = registry.get(block.type);
    if (!definition) return skip("unknown_block_type", block);

    if (!definition.schemaVersions.includes(block.schemaVersion)) {
      return skip(
        "unsupported_schema_version",
        block,
        `schemaVersion=${block.schemaVersion}`,
      );
    }

    if (definition.capability !== null) {
      const resolved = capabilities?.capabilities[definition.capability];
      if (!resolved?.enabled) {
        return skip("capability_disabled", block, definition.capability);
      }

      // Nema provider-a ≠ readiness heuristika: granica je eksplicitna i
      // fail-closed sve dok konkretan domen ne pruži realan status.
      const state = readiness
        ? await readiness.resolve({
            capability: definition.capability,
            blockId: block.id,
            type: block.type as FeatureBlockType,
          })
        : "unconfigured";
      if (state === "unconfigured") {
        return skip("capability_unconfigured", block, definition.capability);
      }
      if (state === "degraded") {
        onDiagnostic?.({
          capability: definition.capability,
          blockId: block.id,
          type: block.type as FeatureBlockType,
          readiness: state,
        });
        if ((definition.degradedPolicy ?? "skip") === "skip") {
          return skip("capability_degraded", block, definition.capability);
        }
      }
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
