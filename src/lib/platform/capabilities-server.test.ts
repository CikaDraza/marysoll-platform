import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("@/models/Tenant", () => ({
  Tenant: { findById: vi.fn() },
}));
vi.mock("@/models/Subscription", () => ({
  Subscription: { findOne: vi.fn() },
}));

import { Tenant } from "@/models/Tenant";
import { Subscription } from "@/models/Subscription";
import {
  requireCapability,
  resolveTenantCapabilitySnapshot,
  resolveTenantCapability,
} from "./capabilities-server";

const TENANT_ID = new Types.ObjectId().toString();

function tenantQuery(value: unknown) {
  const query = {
    select: vi.fn(),
    lean: vi.fn(async () => value),
  };
  query.select.mockReturnValue(query);
  return query;
}

function subscriptionQuery(value: unknown) {
  return { lean: vi.fn(async () => value) };
}

function mockLookup(params: {
  tenant: unknown;
  subscription?: unknown;
}) {
  vi.mocked(Tenant.findById).mockReturnValue(
    tenantQuery(params.tenant) as never,
  );
  vi.mocked(Subscription.findOne).mockReturnValue(
    subscriptionQuery(params.subscription ?? null) as never,
  );
}

async function responseBody(response: Response | null) {
  expect(response).not.toBeNull();
  return (await response?.json()) as Record<string, unknown>;
}

describe("T2B server capability contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("razrešava i dozvoljava capability", async () => {
    mockLookup({ tenant: { plan: "maria", paid: false } });

    await expect(
      resolveTenantCapability(TENANT_ID, "services.catalog"),
    ).resolves.toMatchObject({
      capability: "services.catalog",
      enabled: true,
      platformAvailable: true,
      planEntitled: true,
      tenantEnabled: true,
    });
    await expect(
      requireCapability(TENANT_ID, "services.catalog"),
    ).resolves.toBeNull();
  });

  it("projektuje kompletan skup capability-ja jednim server-side ugovorom", async () => {
    mockLookup({ tenant: { plan: "maria", paid: false } });

    await expect(resolveTenantCapabilitySnapshot(TENANT_ID)).resolves.toMatchObject({
      verticals: ["beauty"],
      capabilities: {
        "services.catalog": { enabled: true },
        "booking.services": { enabled: true },
        "education.catalog": { enabled: false, platformAvailable: true },
      },
    });
    expect(Tenant.findById).toHaveBeenCalledTimes(1);
    expect(Subscription.findOne).toHaveBeenCalledTimes(1);
  });

  it("dozvoljava provisionovan education catalog i projektuje education identitet", async () => {
    mockLookup({
      tenant: {
        plan: "maria",
        verticals: ["education"],
        capabilityConfiguration: {
          overrides: [{ capability: "education.catalog", enabled: true }],
        },
      },
    });

    await expect(
      resolveTenantCapabilitySnapshot(TENANT_ID),
    ).resolves.toMatchObject({
      verticals: ["education"],
      capabilities: { "education.catalog": { enabled: true } },
    });
    await expect(
      requireCapability(TENANT_ID, "education.catalog"),
    ).resolves.toBeNull();
  });

  it("projektuje hybrid vertikale bez browser-side računanja", async () => {
    mockLookup({
      tenant: {
        plan: "maria",
        verticals: ["beauty", "education"],
        capabilityConfiguration: {
          overrides: [
            { capability: "services.catalog", enabled: true },
            { capability: "education.catalog", enabled: true },
          ],
        },
      },
    });

    await expect(
      resolveTenantCapabilitySnapshot(TENANT_ID),
    ).resolves.toMatchObject({
      verticals: ["beauty", "education"],
      capabilities: {
        "services.catalog": { enabled: true },
        "education.catalog": { enabled: true },
      },
    });
  });

  it("drži education inquiries platform-unavailable", async () => {
    mockLookup({
      tenant: {
        plan: "maria",
        verticals: ["education"],
        capabilityConfiguration: {
          overrides: [{ capability: "education.inquiries", enabled: true }],
        },
      },
    });

    const response = await requireCapability(TENANT_ID, "education.inquiries");
    expect(response?.status).toBe(403);
    expect(await responseBody(response)).toMatchObject({
      code: "CAPABILITY_NOT_AVAILABLE",
      capability: "education.inquiries",
    });
  });

  it("odbija capability koji plan ne uključuje", async () => {
    mockLookup({
      tenant: {
        plan: "maria",
        verticals: ["beauty"],
        capabilityConfiguration: {
          overrides: [{ capability: "loyalty.rewards", enabled: true }],
        },
      },
    });

    const response = await requireCapability(TENANT_ID, "loyalty.rewards");
    expect(response?.status).toBe(403);
    expect(await responseBody(response)).toMatchObject({
      code: "CAPABILITY_NOT_INCLUDED_IN_PLAN",
      capability: "loyalty.rewards",
    });
  });

  it("poštuje aktivni Subscription feature override iz postojećeg plan sloja", async () => {
    mockLookup({
      tenant: {
        plan: "maria",
        verticals: ["beauty"],
        capabilityConfiguration: {
          overrides: [{ capability: "loyalty.rewards", enabled: true }],
        },
      },
      subscription: {
        plan: "maria",
        status: "trialing",
        featureOverrides: { loyaltyCore: true },
        overrideExpiresAt: new Date(Date.now() + 60_000),
      },
    });

    await expect(
      requireCapability(TENANT_ID, "loyalty.rewards"),
    ).resolves.toBeNull();
  });

  it("odbija tenant-disabled capability", async () => {
    mockLookup({
      tenant: {
        plan: "maria",
        verticals: ["beauty"],
        capabilityConfiguration: {
          overrides: [{ capability: "services.catalog", enabled: false }],
        },
      },
    });

    const response = await requireCapability(TENANT_ID, "services.catalog");
    expect(response?.status).toBe(403);
    expect(await responseBody(response)).toMatchObject({
      code: "CAPABILITY_NOT_ENABLED",
      capability: "services.catalog",
    });
  });

  it("odbija missing tenant i nepoznat capability", async () => {
    mockLookup({ tenant: null });
    const missing = await requireCapability(TENANT_ID, "services.catalog");
    expect(missing?.status).toBe(404);
    expect(await responseBody(missing)).toMatchObject({
      code: "TENANT_NOT_FOUND",
    });

    const unknown = await requireCapability(TENANT_ID, "unknown.capability");
    expect(unknown?.status).toBe(403);
    expect(await responseBody(unknown)).toMatchObject({
      code: "CAPABILITY_NOT_AVAILABLE",
    });
  });
});
