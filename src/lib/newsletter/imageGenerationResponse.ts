/** Accepts only the public API contract: a non-empty URL string. */
export function getImageGenerationUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const url = (payload as Record<string, unknown>).url;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}
