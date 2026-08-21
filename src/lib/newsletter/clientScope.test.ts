import { describe, expect, it } from "vitest";
import { getNewsletterScopeHeaders } from "./clientScope";

describe("getNewsletterScopeHeaders", () => {
  it("sends the explicit platform scope required for a superadmin request", () => {
    expect(getNewsletterScopeHeaders({ scope: "platform" })).toEqual({
      "x-newsletter-scope": "platform",
    });
  });

  it("sends an explicitly selected tenant scope for a superadmin request", () => {
    expect(
      getNewsletterScopeHeaders({
        scope: "tenant",
        tenantId: "507f1f77bcf86cd799439011",
      }),
    ).toEqual({
      "x-superadmin-tenant-id": "507f1f77bcf86cd799439011",
    });
  });

  it("keeps a regular tenant-admin request free of superadmin scope headers", () => {
    expect(getNewsletterScopeHeaders()).toEqual({});
  });
});
