import { z } from "zod";

const FAVICON_MAX_BYTES = 5 * 1024 * 1024;
export const faviconColorSchema = z.union([
  z.literal(""),
  z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/),
]);

// The URL and intrinsic ratio are server-owned. The form may send legacy
// copies of them, but only these editable fields are accepted for mutation.
export const faviconSettingsSchema = z.strictObject({
  mode: z.enum(["auto", "monogram", "custom"]),
  backgroundColor: faviconColorSchema.optional(),
  foregroundColor: faviconColorSchema.optional(),
});

export const faviconStoredUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" || url.protocol === "http:";
});

export async function validateFaviconFile(file: File): Promise<string | null> {
  if (file.size === 0 || file.size > FAVICON_MAX_BYTES) return "Ikonica mora biti manja od 5 MB.";
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  const ico = bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0 && bytes[4] > 0;
  const format = png ? "png" : jpeg ? "jpeg" : webp ? "webp" : ico ? "ico" : null;
  const mime = { png: ["image/png"], jpeg: ["image/jpeg", "image/jpg"], webp: ["image/webp"], ico: ["image/x-icon", "image/vnd.microsoft.icon", "application/octet-stream"] };
  const extension = file.name.split(".").pop()?.toLowerCase();
  const validExtension = format === "jpeg" ? ["jpg", "jpeg"].includes(extension ?? "") : extension === format;
  if (!format || !validExtension || !mime[format].includes(file.type)) return "Ikonica mora biti ispravan ICO, PNG, JPG ili WebP fajl.";
  return null;
}
