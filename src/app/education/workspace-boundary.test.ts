import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Edu admin workspace boundary", () => {
  it("dodaje UI-1 content shell bez budućih domena", () => {
    const root = path.join(process.cwd(), "src/app/education");
    for (const route of [
      "page.tsx",
      "offerings/page.tsx",
      "inquiries/page.tsx",
      "content/page.tsx",
      "content/new/page.tsx",
      "content/[id]/page.tsx",
    ]) {
      expect(existsSync(path.join(root, route))).toBe(true);
    }
    for (const deferred of ["programs", "analytics"]) {
      expect(existsSync(path.join(root, deferred))).toBe(false);
    }
  });

  it("ne uvodi aktivacioni CTA u workspace", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/education/page.tsx"),
      "utf8",
    );
    expect(source).not.toContain("Aktiviraj Edu Centar");
    expect(source).not.toMatch(/Faza 0|Faza 4B/);
    expect(source).toContain('href="/education/content"');
  });

  it("štiti ceo workspace server-side resolved capability snapshotom", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/education/layout.tsx"),
      "utf8",
    );
    expect(source).toContain("await cookies()");
    expect(source).toContain("verifyToken(token)");
    expect(source).toContain("resolveTenantCapabilitySnapshot(actor.tenantId)");
    expect(source).toContain("resolveAdminWorkspaceNavigation(snapshot)");
    expect(source).not.toContain("useAuth");
  });

  it("CMS ekrani ne govore roadmap jezikom", () => {
    const sources = [
      "src/components/education/EducationContentList.tsx",
      "src/components/education/EducationContentEditor.tsx",
      "src/app/education/content/page.tsx",
      "src/app/education/content/new/page.tsx",
    ].map((file) => readFileSync(path.join(process.cwd(), file), "utf8"));

    for (const source of sources) {
      expect(source).not.toMatch(
        /Faza \d|F3B|F4B|F6B|UI-2|UI-3|workspace shell|dolazi kasnije|rezervisana/i,
      );
    }
  });

  it("editor je pun ekran nad deljenim Content Composer-om, bez sopstvenih blokova", () => {
    const editor = readFileSync(
      path.join(process.cwd(), "src/components/education/EducationContentEditor.tsx"),
      "utf8",
    );

    expect(editor).toContain(
      '@/components/content-composer/editor/ContentBlocksEditor',
    );
    expect(editor).toContain('@/components/content-composer/PreviewRenderer');
    expect(editor).toContain('useContentMediaAuthoring');
    // Modal bi pokvario ugovor punog ekrana; education-specific blok bi pokvario
    // deljeni registry.
    expect(editor).not.toMatch(/Dialog|AdminSemanticModal/);
    expect(editor).not.toMatch(/EducationArticleBlock|EducationCalloutBlock|EducationFileBlock/);
  });
});
