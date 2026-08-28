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
});
