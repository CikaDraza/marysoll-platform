/**
 * lib/platform/blocks/registry.ts — FeatureBlockRegistry.
 *
 * Registry zna: `type`, `schemaVersion`, shemu config-a, server loader,
 * capability metapodatak.
 *
 * Registry NE zna: koja tema koji blok renderuje, niti koja tema ignoriše koji
 * CMS flag. To je posao Composition Inventara, a privremena kompatibilnost je
 * poseban, izbrisiv sloj. Ta granica je acceptance kriterijum T2A koraka 4 i
 * čuva ga test granice u `registry.test.ts` (skenira ovaj fajl na pojmove
 * kompozicije — pa ih ovde nema ni u komentaru).
 *
 * Registry ujedno zadovoljava `BlockTypeResolver` iz @panta/theme-engine, pa
 * engine može da odbije publish nepoznatog bloka bez ijednog Marysoll pojma.
 */

import type { BlockTypeResolver } from "@panta/theme-engine";
import { FEATURE_BLOCK_DEFINITIONS } from "./definitions";
import type { FeatureBlockDefinition, FeatureBlockType } from "./types";

export interface FeatureBlockRegistry extends BlockTypeResolver {
  get(type: string): FeatureBlockDefinition | undefined;
  types(): FeatureBlockType[];
  /** T2B: dok capability resolver ne postoji, sve je `null` = dostupno svima. */
  capabilityFor(type: string): string | null;
}

export function createFeatureBlockRegistry(
  definitions: readonly FeatureBlockDefinition<FeatureBlockType>[],
): FeatureBlockRegistry {
  const byType = new Map<string, FeatureBlockDefinition>();

  for (const def of definitions) {
    if (byType.has(def.type)) {
      throw new Error(`FeatureBlockRegistry: tip "${def.type}" je već registrovan`);
    }
    if (def.schemaVersions.length === 0) {
      throw new Error(`FeatureBlockRegistry: "${def.type}" nema nijednu schemaVersion`);
    }
    byType.set(def.type, def as FeatureBlockDefinition);
  }

  return {
    get: (type) => byType.get(type),
    types: () => [...byType.keys()] as FeatureBlockType[],
    isKnownType: (type) => byType.has(type),
    supportsSchemaVersion: (type, schemaVersion) =>
      byType.get(type)?.schemaVersions.includes(schemaVersion) ?? false,
    capabilityFor: (type) => byType.get(type)?.capability ?? null,
  };
}

/** Jedan registry po procesu — dodavanje bloka je izmena `definitions.ts`. */
export const FEATURE_BLOCK_REGISTRY = createFeatureBlockRegistry(
  FEATURE_BLOCK_DEFINITIONS,
);
