import { describe, expect, it } from "vitest";
import { INTEGRITY_CHECKS } from "@/lib/platform/diagnostic-client";
import {
  PLATFORM_INTEGRITY_COLLECTORS,
  TENANT_INTEGRITY_COLLECTORS,
} from "./collectorRegistry";

describe("integrity registry / collector parity", () => {
  it.each([
    ["tenant", TENANT_INTEGRITY_COLLECTORS],
    ["platform", PLATFORM_INTEGRITY_COLLECTORS],
  ] as const)("svaki %s registry ključ ima tačno poznat collector", (scope, collectors) => {
    const registryKeys = INTEGRITY_CHECKS
      .filter((definition) => definition.scope === scope)
      .map((definition) => definition.key)
      .sort();
    const collectorKeys = Object.keys(collectors).sort();

    // Obe strane moraju biti iste: nema registry ključa bez collectora niti
    // collector mape sa nepoznatim/stale ključem.
    expect(collectorKeys).toEqual(registryKeys);
  });
});
