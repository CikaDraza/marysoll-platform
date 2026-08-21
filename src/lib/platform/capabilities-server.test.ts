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
      capabilities: {
        "services.catalog": { enabled: true },
        "booking.services": { enabled: true },
        "education.catalog": { enabled: false, platformAvailable: false },
      },
    });
    expect(Tenant.findById).toHaveBeenCalledTimes(1);
    expect(Subscription.findOne).toHaveBeenCalledTimes(1);
  });

  it("odbija platform-unavailable capability", async () => {
    mockLookup({
      tenant: {
        plan: "maria",
        verticals: ["education"],
        capabilityConfiguration: {
          overrides: [{ capability: "education.catalog", enabled: true }],
        },
      },
    });

    const response = await requireCapability(TENANT_ID, "education.catalog");
    expect(response?.status).toBe(403);
    expect(await responseBody(response)).toMatchObject({
      code: "CAPABILITY_NOT_AVAILABLE",
      capability: "education.catalog",
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
