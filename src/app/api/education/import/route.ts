/**
 * POST /api/education/import — dokument → predlog drafta.
 *
 * Ruta NIŠTA ne upisuje: vraća naslov, naslovnu sekciju i blokove, a vlasnica
 * ih pregleda u editoru i sama sačuva. Uvoz zato ne može ni slučajno da objavi
 * nešto što nije pročitala.
 */
import { NextResponse } from "next/server";
import { requireEducationContentAuthority } from "@/lib/education/content-authority";
import { draftFromOutline, summarizeOutline } from "@/lib/education/import/toBlocks";
import { isBlankOutline } from "@/lib/education/import/outline";
import {
  IMPORT_MAX_BYTES,
  importFormatOf,
  readDocumentOutline,
} from "@/lib/education/import/readDocument";

export async function POST(request: Request) {
  try {
    const authority = await requireEducationContentAuthority(request);
    if (!authority.ok) return authority.response;

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Izaberite dokument za uvoz", code: "IMPORT_NO_FILE" },
        { status: 400 },
      );
    }
    if (file.size > IMPORT_MAX_BYTES) {
      return NextResponse.json(
        { error: "Dokument je prevelik (najviše 10 MB)", code: "IMPORT_TOO_LARGE" },
        { status: 413 },
      );
    }

    const format = importFormatOf(file);
    if (!format) {
      return NextResponse.json(
        { error: "Podržani su PDF i DOCX dokumenti", code: "IMPORT_UNSUPPORTED" },
        { status: 415 },
      );
    }

    const outline = await readDocumentOutline(file, format);
    if (isBlankOutline(outline)) {
      return NextResponse.json(
        {
          error:
            "Iz dokumenta nije pročitan tekst. Ako je skeniran, tekst se ne može izvući.",
          code: "IMPORT_EMPTY",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      draft: draftFromOutline(outline),
      summary: summarizeOutline(outline),
      format,
    });
  } catch (error) {
    console.error("[POST /api/education/import]", error);
    return NextResponse.json(
      { error: "Dokument nije moguće pročitati" },
      { status: 500 },
    );
  }
}
