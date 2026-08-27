import { hasMeaningfulContent } from "../../src/lib/theme9/sectionNormalization.ts";

export type ProvisioningAction = "FILL" | "PRESERVE" | "NO-OP" | "FORCE";

export interface ProvisioningCandidate {
  path: string;
  current: unknown;
  starter: unknown;
}

export interface ProvisioningDecision extends ProvisioningCandidate {
  action: ProvisioningAction;
  writes: boolean;
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

/** `enabled` je autorska odluka i kada je jedini ključ sekcije. */
function hasAuthoredDecision(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const enabled = (value as Record<string, unknown>).enabled;
  return typeof enabled === "boolean";
}

export function planStarterProvisioning(
  candidates: ProvisioningCandidate[],
  options: { forceReseed?: boolean } = {},
): ProvisioningDecision[] {
  return candidates.map((candidate) => {
    if (same(candidate.current, candidate.starter)) {
      return { ...candidate, action: "NO-OP", writes: false };
    }
    if (options.forceReseed) {
      return { ...candidate, action: "FORCE", writes: true };
    }
    if (
      hasAuthoredDecision(candidate.current) ||
      hasMeaningfulContent(candidate.current)
    ) {
      return { ...candidate, action: "PRESERVE", writes: false };
    }
    return { ...candidate, action: "FILL", writes: true };
  });
}

export function theme9ProvisioningAllowed(
  landingTheme: unknown,
  explicitProvisioning: boolean,
): boolean {
  return landingTheme === "theme-9" || explicitProvisioning;
}
