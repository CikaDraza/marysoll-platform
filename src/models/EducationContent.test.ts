import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import {
  EducationContent,
  EDUCATION_CONTENT_KINDS,
  EDUCATION_CONTENT_STATUSES,
  EDUCATION_CONTENT_VISIBILITIES,
} from "./EducationContent";

function draft(overrides: Record<string, unknown> = {}) {
  return new EducationContent({
    tenantId: new Types.ObjectId(),
    title: "Estetika lica",
    slug: "estetika-lica",
    ...overrides,
  });
}

describe("EducationContent model", () => {
  it("zahteva tenantId", () => {
    const error = new EducationContent({
      title: "Bez tenanta",
      slug: "bez-tenanta",
    }).validateSync();

    expect(error?.errors.tenantId).toBeDefined();
  });

  it("zahteva naslov i slug", () => {
    const error = new EducationContent({
      tenantId: new Types.ObjectId(),
    }).validateSync();

    expect(error?.errors.title).toBeDefined();
    expect(error?.errors.slug).toBeDefined();
  });

  it("podrazumevano kreira privatno-neutralan draft", () => {
    const doc = draft();

    expect(doc.validateSync()).toBeUndefined();
    expect(doc.status).toBe("draft");
    expect(doc.visibility).toBe("public");
    expect(doc.kind).toBe("article");
    expect(doc.publishedAt).toBeNull();
  });

  it("prihvata svaki podržani kind, visibility i status", () => {
    for (const kind of EDUCATION_CONTENT_KINDS) {
      expect(draft({ kind }).validateSync()).toBeUndefined();
    }
    for (const visibility of EDUCATION_CONTENT_VISIBILITIES) {
      expect(draft({ visibility }).validateSync()).toBeUndefined();
    }
    for (const status of EDUCATION_CONTENT_STATUSES) {
      expect(draft({ status }).validateSync()).toBeUndefined();
    }
  });

  it("odbija vrednosti van enum-a", () => {
    expect(draft({ kind: "course" }).validateSync()?.errors.kind).toBeDefined();
    expect(
      draft({ visibility: "assigned" }).validateSync()?.errors.visibility,
    ).toBeDefined();
    expect(
      draft({ status: "archived" }).validateSync()?.errors.status,
    ).toBeDefined();
  });

  it("nema polja koja pripadaju kasnijim fazama", () => {
    const paths = Object.keys(EducationContent.schema.paths);

    for (const forbidden of [
      "clientProfileId",
      "assignments",
      "theme",
      "themeId",
      "educationTheme",
      "courseId",
      "bookingId",
    ]) {
      expect(paths).not.toContain(forbidden);
    }
  });

  it("ima tenant-first indekse i tenant-scoped unique slug", () => {
    const indexes = EducationContent.schema.indexes();

    expect(indexes).toContainEqual([{ tenantId: 1, updatedAt: -1 }, expect.anything()]);
    const slugIndex = indexes.find(
      ([fields]) =>
        JSON.stringify(fields) === JSON.stringify({ tenantId: 1, slug: 1 }),
    );
    expect(slugIndex?.[1]).toMatchObject({ unique: true });

    // Globalno unique slug bi sprečio dva salona da imaju isti naslov.
    for (const [fields, options] of indexes) {
      if ((options as { unique?: boolean })?.unique) {
        expect(Object.keys(fields)).toContain("tenantId");
      }
    }
  });

  it("čuva timestamps", () => {
    expect(EducationContent.schema.paths.createdAt).toBeDefined();
    expect(EducationContent.schema.paths.updatedAt).toBeDefined();
  });
});
