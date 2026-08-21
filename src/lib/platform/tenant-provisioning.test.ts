import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PRODUCTION_ROOTS = ["src", "scripts", "packages"];
const CREATION_PATTERN =
  /\bnew\s+Tenant\s*\(|\bTenant\.(?:create|insertMany)\s*\(|collection\(["']tenants["']\)\s*\.\s*(?:insertOne|insertMany)\s*\(/;

function productionFiles(): string[] {
  const files: string[] = [];
  const visit = (relativeDirectory: string) => {
    const absoluteDirectory = path.join(process.cwd(), relativeDirectory);
    for (const entry of readdirSync(absoluteDirectory)) {
      const relative = path.join(relativeDirectory, entry);
      const absolute = path.join(process.cwd(), relative);
      if (statSync(absolute).isDirectory()) {
        if (entry === "node_modules") continue;
        visit(relative);
      } else if (
        /\.(ts|tsx|mts|mjs)$/.test(entry) &&
        !/\.test\.(ts|tsx)$/.test(entry)
      ) {
        files.push(relative);
      }
    }
  };
  for (const root of PRODUCTION_ROOTS) visit(root);
  return files;
}

describe("Tenant provisioning architecture", () => {
  it("svaki Tenant creation entry point koristi isti capability helper", () => {
    const creationFiles = productionFiles().filter((file) =>
      CREATION_PATTERN.test(readFileSync(path.join(process.cwd(), file), "utf8")),
    );

    expect(creationFiles).toEqual(["src/app/api/tenants/register/route.ts"]);

    for (const file of creationFiles) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toContain("createInitialTenantCapabilityConfiguration");
      expect(source).toContain("...initialCapabilities");
    }
  });
});
