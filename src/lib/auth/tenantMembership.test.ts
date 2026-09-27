import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { tenantMembershipSessionDenial } from "./tenantMembership";

describe("STAFF-2 tenant membership session invariant", () => {
  it.each([
    ["invited", false, "MEMBERSHIP_INACTIVE", 403],
    ["invited", true, "MEMBERSHIP_INACTIVE", 403],
    ["suspended", true, "MEMBERSHIP_INACTIVE", 403],
    ["active", false, "EMAIL_NOT_VERIFIED", 401],
  ] as const)(
    "%s/verified=%s ne može dobiti niti osvežiti sesiju",
    (status, isEmailVerified, code, httpStatus) => {
      expect(
        tenantMembershipSessionDenial({ status, isEmailVerified }),
      ).toMatchObject({ code, httpStatus });
    },
  );

  it("active + verified normalno prolazi", () => {
    expect(
      tenantMembershipSessionDenial({ status: "active", isEmailVerified: true }),
    ).toBeNull();
  });

  it("svi tenant login/refresh ulazi koriste isti invariant", () => {
    for (const file of [
      "src/app/api/tenant-auth/login/route.ts",
      "src/app/api/tenant-auth/refresh/route.ts",
      "src/app/api/auth/login/route.ts",
      "src/app/api/marketplace/auth/login/route.ts",
    ]) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source, file).toContain("tenantMembershipSessionDenial(");
    }
  });
});
