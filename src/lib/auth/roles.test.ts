import { describe, expect, it } from "vitest";
import {
  isBackofficeRole,
  isBusinessAdminRole,
  isOwnerRole,
  isSalonOperatorRole,
  tokenHasBackofficeAccess,
} from "./roles";

describe("STAFF-0 role semantics", () => {
  it.each([
    ["OWNER", true, true, true, true],
    ["ADMIN", true, true, false, true],
    ["STAFF", true, false, false, true],
    ["USER", false, false, false, false],
    ["GUEST", false, false, false, false],
  ] as const)(
    "%s → backoffice=%s admin=%s owner=%s operator=%s",
    (role, backoffice, admin, owner, operator) => {
      expect(isBackofficeRole(role)).toBe(backoffice);
      expect(isBusinessAdminRole(role)).toBe(admin);
      expect(isOwnerRole(role)).toBe(owner);
      expect(isSalonOperatorRole(role)).toBe(operator);
    },
  );

  it("STAFF nije admin ni kada stari token tvrdi isAdmin=true", () => {
    expect(
      tokenHasBackofficeAccess({
        globalRole: "STAFF",
        isAdmin: true,
        isSuperAdmin: false,
      }),
    ).toBe(true);
    expect(isBusinessAdminRole("STAFF")).toBe(false);
  });

  it("legacy owner/admin token bez globalRole zadržava backoffice pristup", () => {
    expect(tokenHasBackofficeAccess({ isAdmin: true })).toBe(true);
  });
});
