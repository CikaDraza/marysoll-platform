import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSuperAdmin = vi.fn();
const findOneAndUpdate = vi.fn();

vi.mock("@/lib/auth/auth-server", () => ({
  requireSuperAdmin: (...args: unknown[]) => requireSuperAdmin(...args),
}));
vi.mock("@/lib/db/mongodb", () => ({
  connectToDB: vi.fn(async () => undefined),
}));
vi.mock("@/models/Subscription", () => ({
  Subscription: {
    findOneAndUpdate: (...args: unknown[]) => findOneAndUpdate(...args),
  },
}));

import { PUT } from "./route";

const TENANT_ID = "507f1f77bcf86cd799439011";

function request(staffMembers: unknown) {
  return new NextRequest(`http://localhost/api/subscriptions/override/${TENANT_ID}`, {
    method: "PUT",
    body: JSON.stringify({
      overrides: { staffMembers },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      note: "STAFF-1 test",
    }),
    headers: { "content-type": "application/json" },
  });
}

describe("subscription staffMembers override", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSuperAdmin.mockReturnValue({ decoded: { isSuperAdmin: true } });
  });

  it.each([-2, 1.5, "3"])(
    "odbija nevalidan limit %s pre DB write-a",
    async (limit) => {
      const response = await PUT(request(limit), {
        params: Promise.resolve({ tenantId: TENANT_ID }),
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        code: "INVALID_STAFF_MEMBER_LIMIT",
      });
      expect(findOneAndUpdate).not.toHaveBeenCalled();
    },
  );

  it.each([-1, 0, 3])("prihvata validan limit %s", async (limit) => {
    findOneAndUpdate.mockResolvedValue({
      featureOverrides: { staffMembers: limit },
      overrideExpiresAt: new Date(Date.now() + 60_000),
      overrideNote: "STAFF-1 test",
    });

    const response = await PUT(request(limit), {
      params: Promise.resolve({ tenantId: TENANT_ID }),
    });

    expect(response.status).toBe(200);
    expect(findOneAndUpdate).toHaveBeenCalledOnce();
  });
});
