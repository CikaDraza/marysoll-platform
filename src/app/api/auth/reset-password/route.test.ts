import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn(async () => "new-password-hash") },
}));
vi.mock("@/models/AuthUser", () => ({ AuthUser: { findOne: vi.fn() } }));
vi.mock("@/models/TenantUser", () => ({ TenantUser: { findOne: vi.fn() } }));

import { AuthUser } from "@/models/AuthUser";
import { TenantUser } from "@/models/TenantUser";
import { POST } from "./route";

function request(body: object) {
  return new Request("https://marysoll.com/api/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/reset-password", () => {
  it("menja TenantUser lozinku i troši token", async () => {
    const tenantUser = {
      password: "old",
      resetPasswordToken: "token",
      resetPasswordExpiry: new Date(Date.now() + 60_000),
      save: vi.fn(async () => {}),
    };
    vi.mocked(TenantUser.findOne).mockResolvedValue(tenantUser as never);

    const response = await POST(
      request({ token: "valid-token", newPassword: "NovaLozinka123" }),
    );

    expect(response.status).toBe(200);
    expect(tenantUser.password).toBe("new-password-hash");
    expect(tenantUser.resetPasswordToken).toBeNull();
    expect(tenantUser.resetPasswordExpiry).toBeNull();
    expect(tenantUser.save).toHaveBeenCalledTimes(1);
    expect(AuthUser.findOne).not.toHaveBeenCalled();
  });

  it("menja SUPER_ADMIN AuthUser lozinku kada nema tenant tokena", async () => {
    const authUser = {
      passwordHash: "old",
      resetPasswordToken: "token",
      resetPasswordExpires: new Date(Date.now() + 60_000),
      save: vi.fn(async () => {}),
    };
    vi.mocked(TenantUser.findOne).mockResolvedValue(null);
    vi.mocked(AuthUser.findOne).mockResolvedValue(authUser as never);

    const response = await POST(
      request({ token: "valid-token", newPassword: "NovaLozinka123" }),
    );

    expect(response.status).toBe(200);
    expect(authUser.passwordHash).toBe("new-password-hash");
    expect(authUser.resetPasswordToken).toBeNull();
    expect(authUser.resetPasswordExpires).toBeNull();
    expect(authUser.save).toHaveBeenCalledTimes(1);
  });
});
