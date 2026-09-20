import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({
    "x-tenant-slug": "ash-studio",
    "x-domain-type": "client",
  })),
}));
vi.mock("@/lib/tenant/fetchTenantData", () => ({
  fetchPublicSalonProfile: vi.fn(async () => ({ name: "ASH Studio" })),
}));
vi.mock("@/components/client/ClientHomePage", () => ({ ClientHomePage: () => null }));
vi.mock("@/lib/seo/public-site", () => ({
  getPublicSiteContext: vi.fn(() => ({ kind: "TENANT" })),
  tenantPageMetadata: vi.fn(() => ({ title: "ASH Studio" })),
}));
vi.mock("@/lib/seo/metadataFallback", () => ({
  buildTenantMetadataFacts: vi.fn(() => ({})),
  resolveTenantTitle: vi.fn(() => "ASH Studio"),
  resolveTenantDescription: vi.fn(() => "Studio"),
}));

import { generateMetadata } from "./page";

describe("tenant home metadata", () => {
  it("leaves favicon and Apple icons to the tenant layout", async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("ASH Studio");
    expect(metadata.icons).toBeUndefined();
  });
});
