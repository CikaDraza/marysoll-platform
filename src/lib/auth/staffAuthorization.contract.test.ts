import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const API_DIR = path.join(process.cwd(), "src/app/api");

function routeFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) routeFiles(full, acc);
    else if (entry === "route.ts") acc.push(full);
  }
  return acc;
}

describe("STAFF-0 authorization contract", () => {
  it("svaki requireAdmin/requireTenantAdmin potrosac await-uje DB gate", () => {
    const violations: string[] = [];
    for (const file of routeFiles(API_DIR)) {
      const source = readFileSync(file, "utf8");
      if (
        /(?<!await )requireAdmin\(/.test(source) ||
        /(?<!await )requireTenantAdmin\(/.test(source)
      ) {
        violations.push(path.relative(API_DIR, file));
      }
    }
    expect(violations).toEqual([]);
  });

  it("svi tenant login/refresh ulazi koriste OWNER+ADMIN admin semantiku", () => {
    const files = [
      "src/app/api/auth/login/route.ts",
      "src/app/api/tenant-auth/login/route.ts",
      "src/app/api/tenant-auth/refresh/route.ts",
      "src/app/api/marketplace/auth/login/route.ts",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toContain("isBusinessAdminRole");
      expect(source, file).not.toMatch(
        /\["OWNER", "ADMIN", "STAFF"\]\.includes\([^)]*role/,
      );
    }
  });

  it("owner-sensitive rute koriste requireOwner", () => {
    for (const file of [
      "src/app/api/tenant-auth/delete-account/route.ts",
      "src/app/api/tenants/identity/route.ts",
    ]) {
      expect(readFileSync(file, "utf8"), file).toContain("requireOwner");
    }
  });
});
