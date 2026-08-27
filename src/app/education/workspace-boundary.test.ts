import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Edu F0 workspace boundary", () => {
  it("rezerviše samo F0 rute", () => {
    const root = path.join(process.cwd(), "src/app/education");
    for (const route of ["page.tsx", "offerings/page.tsx", "inquiries/page.tsx"]) {
      expect(existsSync(path.join(root, route))).toBe(true);
    }
    for (const deferred of ["content", "programs", "analytics"]) {
      expect(existsSync(path.join(root, deferred))).toBe(false);
    }
  });

  it("ne uvodi aktivacioni CTA u workspace", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/education/page.tsx"),
      "utf8",
    );
    expect(source).not.toContain("Aktiviraj Edu Centar");
  });
});
