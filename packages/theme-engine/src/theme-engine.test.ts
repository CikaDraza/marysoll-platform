import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  deriveDraftFrom,
  publishRevision,
  selectRenderableBlocks,
  validateThemeDocument,
} from "./index";
import type {
  BlockTypeResolver,
  LayoutDefinition,
  ThemeDocument,
} from "./types";

const layout: LayoutDefinition = {
  id: "landing-v1",
  version: 1,
  sections: [
    {
      sectionType: "hero",
      variants: {
        default: {
          slots: [
            { name: "main", maxBlocks: 1 },
            { name: "cta", maxBlocks: 2, accepts: ["content.cta"] },
          ],
        },
      },
    },
    {
      sectionType: "content",
      variants: {
        default: { slots: [{ name: "main", accepts: "any" }] },
        split: { slots: [{ name: "main" }, { name: "aside" }] },
      },
    },
  ],
};

function doc(overrides: Partial<ThemeDocument> = {}): ThemeDocument {
  return {
    version: 1,
    layoutDefinitionId: "landing-v1",
    lifecycle: "draft",
    brand: { colors: {}, typography: {} },
    sections: [
      {
        id: "s1",
        sectionType: "hero",
        blocks: [
          { id: "b1", type: "content.hero", schemaVersion: 1, slot: "main" },
        ],
      },
    ],
    ...overrides,
  };
}

const resolver: BlockTypeResolver = {
  isKnownType: (t) => ["content.hero", "content.cta", "services.catalog"].includes(t),
  supportsSchemaVersion: (_t, v) => v === 1,
};

describe("validacija dokumenta protiv layout definicije", () => {
  it("prolazi za ispravan dokument", () => {
    expect(validateThemeDocument(doc(), layout, { mode: "publish", resolver }).ok).toBe(
      true,
    );
  });

  it("odbija nepostojeći slot", () => {
    const d = doc({
      sections: [
        {
          id: "s1",
          sectionType: "hero",
          blocks: [
            { id: "b1", type: "content.hero", schemaVersion: 1, slot: "aside" },
          ],
        },
      ],
    });
    const res = validateThemeDocument(d, layout, { mode: "render" });
    expect(res.ok).toBe(false);
    expect(res.issues[0].code).toBe("unknown_slot");
  });

  it("odbija nepostojeću varijantu sekcije", () => {
    const d = doc({
      sections: [{ id: "s1", sectionType: "content", variant: "grid", blocks: [] }],
    });
    const res = validateThemeDocument(d, layout, { mode: "render" });
    expect(res.issues.map((i) => i.code)).toContain("unknown_variant");
  });

  it("poštuje maxBlocks i accepts", () => {
    const d = doc({
      sections: [
        {
          id: "s1",
          sectionType: "hero",
          blocks: [
            { id: "b1", type: "content.cta", schemaVersion: 1, slot: "cta" },
            { id: "b2", type: "content.cta", schemaVersion: 1, slot: "cta" },
            { id: "b3", type: "content.cta", schemaVersion: 1, slot: "cta" },
            { id: "b4", type: "services.catalog", schemaVersion: 1, slot: "cta" },
          ],
        },
      ],
    });
    const codes = validateThemeDocument(d, layout, { mode: "render" }).issues.map(
      (i) => i.code,
    );
    expect(codes).toContain("slot_over_capacity");
    expect(codes).toContain("block_type_not_accepted");
  });

  it("hvata duple id-jeve", () => {
    const d = doc({
      sections: [
        {
          id: "s1",
          sectionType: "hero",
          blocks: [
            { id: "b1", type: "content.hero", schemaVersion: 1, slot: "main" },
          ],
        },
        {
          id: "s1",
          sectionType: "content",
          blocks: [
            { id: "b1", type: "services.catalog", schemaVersion: 1, slot: "main" },
          ],
        },
      ],
    });
    const codes = validateThemeDocument(d, layout, { mode: "render" }).issues.map(
      (i) => i.code,
    );
    expect(codes).toContain("duplicate_section_id");
    expect(codes).toContain("duplicate_block_id");
  });

  it("odbija dokument sa pogrešnim layoutDefinitionId", () => {
    const res = validateThemeDocument(
      doc({ layoutDefinitionId: "landing-v2" }),
      layout,
      { mode: "render" },
    );
    expect(res.issues[0].code).toBe("unknown_layout_definition");
  });
});

describe("nepoznat blok — render tolerantan, publish strog", () => {
  const withUnknown = doc({
    sections: [
      {
        id: "s1",
        sectionType: "hero",
        blocks: [
          { id: "b1", type: "future.block", schemaVersion: 1, slot: "main" },
        ],
      },
    ],
  });

  it("publish odbija nepoznat tip", () => {
    const res = validateThemeDocument(withUnknown, layout, {
      mode: "publish",
      resolver,
    });
    expect(res.issues.map((i) => i.code)).toContain("unknown_block_type");
  });

  it("render ne prijavljuje nepoznat tip kao grešku", () => {
    expect(validateThemeDocument(withUnknown, layout, { mode: "render", resolver }).ok).toBe(
      true,
    );
  });

  it("publish odbija nepodržan schemaVersion", () => {
    const d = doc({
      sections: [
        {
          id: "s1",
          sectionType: "hero",
          blocks: [
            { id: "b1", type: "content.hero", schemaVersion: 7, slot: "main" },
          ],
        },
      ],
    });
    const res = validateThemeDocument(d, layout, { mode: "publish", resolver });
    expect(res.issues.map((i) => i.code)).toContain("unsupported_schema_version");
  });

  it("selectRenderableBlocks preskače nepoznato i beleži razlog", () => {
    const d = doc({
      sections: [
        {
          id: "s1",
          sectionType: "hero",
          blocks: [
            { id: "b1", type: "content.hero", schemaVersion: 1, slot: "main" },
            { id: "b2", type: "future.block", schemaVersion: 1, slot: "main" },
            { id: "b3", type: "content.cta", schemaVersion: 9, slot: "cta" },
          ],
        },
      ],
    });
    const { blocks, skipped } = selectRenderableBlocks(d, resolver);
    expect(blocks.map((b) => b.id)).toEqual(["b1"]);
    expect(skipped.map((s) => s.reason)).toEqual([
      "unknown_block_type",
      "unsupported_schema_version",
    ]);
  });
});

describe("lifecycle i publish invarijante", () => {
  it("dozvoljava draft → published, zabranjuje published → draft", () => {
    expect(canTransition("draft", "published")).toBe(true);
    expect(canTransition("published", "draft")).toBe(false);
    expect(assertTransition("archived", "published").ok).toBe(false);
  });

  it("izmena objavljene teme pravi novu draft reviziju, original netaknut", () => {
    const published = doc({ version: 3, lifecycle: "published" });
    const next = deriveDraftFrom(published);
    expect(next.version).toBe(4);
    expect(next.lifecycle).toBe("draft");
    expect(published.lifecycle).toBe("published");
    expect(published.version).toBe(3);
    // duboka kopija — izmena novog ne dira staro
    next.sections[0].blocks[0].id = "izmenjeno";
    expect(published.sections[0].blocks[0].id).toBe("b1");
  });

  it("publish arhivira prethodnu aktivnu reviziju u istom rezultatu", () => {
    const current = doc({ version: 1, lifecycle: "published" });
    const candidate = doc({ version: 2, lifecycle: "draft" });
    const res = publishRevision(candidate, current);
    expect(res.ok).toBe(true);
    expect(res.published?.lifecycle).toBe("published");
    expect(res.published?.version).toBe(2);
    expect(res.archived?.lifecycle).toBe("archived");
    expect(res.archived?.version).toBe(1);
  });

  it("odbija publish revizije koja nije novija od aktivne", () => {
    const current = doc({ version: 5, lifecycle: "published" });
    const res = publishRevision(doc({ version: 5, lifecycle: "draft" }), current);
    expect(res.ok).toBe(false);
    expect(res.issues[0].code).toBe("invalid_version");
  });

  it("prvi publish radi i bez prethodne revizije", () => {
    const res = publishRevision(doc({ version: 1, lifecycle: "draft" }));
    expect(res.ok).toBe(true);
    expect(res.archived).toBeUndefined();
  });
});
