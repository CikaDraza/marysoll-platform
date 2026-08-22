import { createHash } from "node:crypto";

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

function normalize(value: unknown): CanonicalValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Fingerprint ne podržava non-finite broj");
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    return Object.keys(source)
      .sort()
      .reduce<Record<string, CanonicalValue>>((result, key) => {
        if (source[key] !== undefined) result[key] = normalize(source[key]);
        return result;
      }, {});
  }
  throw new TypeError(`Fingerprint ne podržava tip ${typeof value}`);
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function commandFingerprint(value: unknown): string {
  return createHash("sha256").update(canonicalStringify(value)).digest("hex");
}
