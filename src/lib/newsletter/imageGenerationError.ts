const DEFAULT_IMAGE_GENERATION_ERROR =
  "Generisanje slike trenutno nije dostupno. Pokušajte ponovo za nekoliko minuta.";

function readMessage(
  payload: unknown,
  key: "error" | "upgrade",
): string | null {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

/** Converts the safe API error contract into the short message shown to an admin. */
export function getImageGenerationErrorMessage(payload: unknown): string {
  return (
    readMessage(payload, "upgrade") ??
    readMessage(payload, "error") ??
    DEFAULT_IMAGE_GENERATION_ERROR
  );
}
