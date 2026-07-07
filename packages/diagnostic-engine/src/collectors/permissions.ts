/**
 * Permissions collector — snapshot browser dozvola koje platforma koristi.
 * navigator.permissions.query baca za imena koja browser ne poznaje, pa se
 * svako ime ispituje zasebno ("n/a" umesto rušenja).
 */
import type { ModuleResult } from "../types";
import { capData, capDetail } from "../types";

const PERMISSION_NAMES = [
  "notifications",
  "geolocation",
  "camera",
  "microphone",
] as const;

export async function collectPermissions(): Promise<ModuleResult> {
  const base = { key: "permissions", name: "Dozvole browsera", ms: null };
  try {
    if (!("permissions" in navigator) || !navigator.permissions?.query) {
      return {
        ...base,
        state: "info",
        detail: capDetail("Permissions API nedostupan u ovom browseru"),
      };
    }

    const data: Record<string, string> = {};
    for (const name of PERMISSION_NAMES) {
      try {
        const status = await navigator.permissions.query({
          name: name as PermissionName,
        });
        data[name] = status.state; // "granted" | "denied" | "prompt"
      } catch {
        data[name] = "n/a";
      }
    }

    const denied = Object.entries(data).filter(([, v]) => v === "denied");
    return {
      ...base,
      state: denied.length > 0 ? "warn" : "info",
      detail: capDetail(
        denied.length > 0
          ? `odbijeno: ${denied.map(([k]) => k).join(", ")}`
          : "nijedna dozvola nije odbijena",
      ),
      data: capData(data),
    };
  } catch (err) {
    return {
      ...base,
      state: "fail",
      detail: capDetail(
        `collector pao (${err instanceof Error ? err.name : "greška"})`,
      ),
    };
  }
}
