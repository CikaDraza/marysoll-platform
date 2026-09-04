import "server-only";

import { outlineFromLines } from "./fromLines";
import { outlineFromHtml } from "./fromHtml";
import type { DocumentOutline } from "./outline";

export const IMPORT_MAX_BYTES = 10 * 1024 * 1024;

export type ImportFormat = "pdf" | "docx";

export function importFormatOf(file: {
  name: string;
  type: string;
}): ImportFormat | null {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf";
  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.docx$/i.test(file.name)
  ) {
    return "docx";
  }
  return null;
}

/**
 * Čitanje dokumenta — jedino mesto koje zna za formate.
 *
 * DOCX nosi pravu strukturu (naslovi, liste), pa se čita verno. PDF je nosi
 * samo vizuelno — metak nabrajanja je crtež — pa se struktura pogađa. Zato je
 * rezultat uvek draft za pregled, nikada objava.
 */
export async function readDocumentOutline(
  file: File,
  format: ImportFormat,
): Promise<DocumentOutline> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (format === "docx") {
    const { convertToHtml } = await import("mammoth");
    const { value } = await convertToHtml({ buffer });
    return outlineFromHtml(value);
  }

  // `unpdf` je pdfjs bez native zavisnosti — radi i u serverless okruženju.
  const { extractText, getDocumentProxy } = await import("unpdf");
  const { text } = await extractText(
    await getDocumentProxy(new Uint8Array(buffer)),
    { mergePages: true },
  );
  return outlineFromLines(text);
}
