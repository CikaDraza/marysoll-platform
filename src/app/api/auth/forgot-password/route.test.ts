import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("@/lib/email/email", () => ({
  sendResetEmail: vi.fn(async () => {}),
  sendResetEmailOnAssistant: vi.fn(async () => {}),
}));
vi.mock("@/models/AuthUser", () => ({ AuthUser: { findOne: vi.fn() } }));
vi.mock("@/models/TenantUser", () => ({ TenantUser: { findOne: vi.fn() } }));
vi.mock("@/models/Tenant", () => ({
  Tenant: { findOne: vi.fn(), findById: vi.fn() },
}));

import { AuthUser } from "@/models/AuthUser";
import { TenantUser } from "@/models/TenantUser";
import { Tenant } from "@/models/Tenant";
import { sendResetEmail } from "@/lib/email/email";
import { POST } from "./route";

function sortedQuery(doc: unknown) {
  return { sort: async () => doc };
}

function leanQuery(doc: unknown) {
  return { select: () => ({ lean: async () => doc }) };
}

function request(body: object, tenantSlugHeader: string | null = "") {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (tenantSlugHeader !== null) headers["x-tenant-slug"] = tenantSlugHeader;
  return new NextRequest("https://marysoll.com/api/auth/forgot-password", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function ownerDoc() {
  return {
    email: "owner@example.com",
    name: "Vlasnica",
    role: "OWNER",
    tenantId: "tenant-1",
    resetPasswordToken: null,
    resetPasswordExpiry: null,
    save: vi.fn(async () => {}),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(AuthUser.findOne).mockResolvedValue(null);
});

describe("POST /api/auth/forgot-password", () => {
  it("platformski forgot-password pronalazi OWNER nalog bez tenant slug-a i šalje reset", async () => {
    const owner = ownerDoc();
    vi.mocked(TenantUser.findOne).mockReturnValue(sortedQuery(owner) as never);
    vi.mocked(Tenant.findById).mockReturnValue(
      leanQuery({ _id: "tenant-1", name: "Salon" }) as never,
    );

    const response = await POST(request({ email: " Owner@Example.com " }));

    expect(response.status).toBe(200);
    expect(TenantUser.findOne).toHaveBeenCalledWith({
      email: "owner@example.com",
      role: { $in: ["OWNER", "ADMIN", "STAFF"] },
    });
    expect(owner.resetPasswordToken).toMatch(/^[0-9a-f]{64}$/);
    expect(owner.save).toHaveBeenCalledTimes(1);
    expect(sendResetEmail).toHaveBeenCalledWith(
      "owner@example.com",
      owner.resetPasswordToken,
      "Vlasnica",
      "tenant-1",
    );
  });

  it("tenant reset ostaje ograničen na salon iz slug-a", async () => {
    const owner = ownerDoc();
    vi.mocked(Tenant.findOne).mockReturnValue(
      leanQuery({ _id: "tenant-1", name: "Salon" }) as never,
    );
    vi.mocked(TenantUser.findOne).mockResolvedValue(owner as never);

    await POST(
      request({ email: "owner@example.com" }, "marina-skincare"),
    );

    expect(Tenant.findOne).toHaveBeenCalledWith({ slug: "marina-skincare" });
    expect(TenantUser.findOne).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      email: "owner@example.com",
    });
  });

  it("nepostojeći nalog vraća generičku poruku bez slanja", async () => {
    vi.mocked(TenantUser.findOne).mockReturnValue(sortedQuery(null) as never);

    const response = await POST(request({ email: "nobody@account.invalid" }));

    expect(response.status).toBe(200);
    expect((await response.json()).message).toContain("Ako nalog postoji");
    expect(sendResetEmail).not.toHaveBeenCalled();
  });
});
