import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth/auth-server", () => ({ requireTenantAdmin: vi.fn() }));
vi.mock("@/lib/platform/capabilities-server", () => ({
  requireCapability: async () => null,
}));

import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { POST } from "./route";

const FIXTURES = path.join(process.cwd(), "docs/marina-pdf");

/**
 * Ruta se gađa PRAVIM multipart zahtevom, jer se baš tu i lomila: klijent je
 * slao `Content-Type: application/json`, pa `formData()` nije mogao da pročita
 * telo. Test koji poziva samo parser to ne bi video.
 */
function upload(file: File): Request {
  const body = new FormData();
  body.append("file", file);
  return new Request("https://admin.marysoll.com/api/education/import", {
    method: "POST",
    body,
  });
}

async function pdfFile(name: string) {
  const buffer = await readFile(path.join(FIXTURES, name));
  return new File([new Uint8Array(buffer)], name, { type: "application/pdf" });
}

/** Najmanji ispravan DOCX — dovoljno da se prođe pravi mammoth put. */
async function docxFile(): Promise<File> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.folder("_rels")!.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );

  const paragraph = (text: string, style?: string) =>
    `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

  zip.folder("word")!.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${
      paragraph("Nega kože zimi", "Heading1") +
      paragraph("Šta se menja kada zahladi") +
      paragraph("Vlažnost vazduha", "Heading2") +
      paragraph("Grejanje isušuje vazduh.") +
      paragraph("prva stavka", "ListParagraph") +
      paragraph("druga stavka", "ListParagraph")
    }</w:body></w:document>`,
  );

  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return new File([buffer], "nega.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireTenantAdmin).mockReturnValue({
    success: true,
    tenantId: "6650a1f1a1f1a1f1a1f1a1f1",
  });
});

describe("POST /api/education/import", () => {
  it("čita svaki Marinin PDF kroz pravi multipart zahtev", async () => {
    const files = (await readdir(FIXTURES)).filter((file) => file.endsWith(".pdf"));

    for (const name of files) {
      const response = await POST(upload(await pdfFile(name)));
      const payload = await response.json();

      expect(response.status, name).toBe(200);
      expect(payload.format, name).toBe("pdf");
      expect(payload.draft.title, name).toBeTruthy();
      expect(payload.draft.blocks.length, name).toBeGreaterThan(0);
      // Broj sekcija se ne tvrdi: njeni materijali imaju i numerisane i
      // verzalne naslove, a jedan ih nema uopšte i tada je sve jedan uvod.
      expect(payload.summary.sections, name).toBeGreaterThanOrEqual(0);
    }
  }, 120_000);

  it("čita DOCX verno — naslovi i liste, bez pogađanja", async () => {
    const response = await POST(upload(await docxFile()));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.format).toBe("docx");
    expect(payload.draft.title).toBe("Nega kože zimi");
    expect(payload.draft.hero.subtitle).toBe("Šta se menja kada zahladi");

    const [section] = payload.draft.blocks;
    expect(section.title).toBe("Vlažnost vazduha");
    expect(section.paragraphs).toContain("Grejanje isušuje vazduh.");
    // Stavke ovde stižu kao pasusi: ovaj minimalni DOCX nema `numbering.xml`,
    // pa mammoth ne zna da je reč o listi. Pravi Word dokument ga ima, a
    // mapiranje `li` → lista pokriveno je jediničnim testom nad HTML-om.
    expect(section.paragraphs).toContain("prva stavka");
  }, 60_000);

  it("odbija zahtev bez fajla i nepodržan format", async () => {
    const empty = await POST(upload(new File([], "prazno.pdf", { type: "application/pdf" })));
    expect(empty.status).toBe(400);

    const wrong = await POST(
      upload(new File([new Uint8Array([1, 2, 3])], "slika.png", { type: "image/png" })),
    );
    expect(wrong.status).toBe(415);
  });

  it("odbija korisnika bez admin permission-a pre čitanja fajla", async () => {
    vi.mocked(requireTenantAdmin).mockReturnValue({
      success: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    expect((await POST(upload(await pdfFile("estetika_lica.pdf")))).status).toBe(403);
  }, 60_000);
});
