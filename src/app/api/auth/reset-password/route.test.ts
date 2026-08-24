import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn(async () => "new-password-hash") },
}));
vi.mock("@/models/AuthUser", () => ({
  AuthUser: { findOne: vi.fn(), findByIdAndUpdate: vi.fn(async () => null) },
}));
vi.mock("@/models/TenantUser", () => ({
  TenantUser: { findOne: vi.fn(), updateMany: vi.fn(async () => ({})) },
}));

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

  it("menja AuthUser lozinku kada nema tenant tokena (i za vlasnicu bez salona)", async () => {
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

/**
 * Regresija: vlasnica koja je obrisala salon a zadržala nalog.
 *
 * Lozinka je živela na dva mesta — `TenantUser.password` i
 * `AuthUser.passwordHash` — a `change-password` je menjao samo prvo. Kada
 * salon nestane, ostane samo zastareo `AuthUser` hash, pa prijava vraća
 * „Pogrešna lozinka" i za staru i za novu lozinku. Reset je bio ograđen na
 * `platformRole: "SUPER_ADMIN"`, pa ni oporavak nije radio.
 */
describe("sinhronizacija dva password store-a", () => {
  it("reset preko AuthUser tokena prepisuje i vezane TenantUser zapise", async () => {
    vi.mocked(TenantUser.findOne).mockResolvedValue(null as never);
    const authUser = {
      _id: "auth-1",
      passwordHash: "stari-hash",
      resetPasswordToken: "token",
      resetPasswordExpires: new Date(Date.now() + 60_000),
      save: vi.fn(async () => {}),
    };
    vi.mocked(AuthUser.findOne).mockResolvedValue(authUser as never);

    const response = await POST(
      request({ token: "valid-token", newPassword: "NovaLozinka123" }),
    );

    expect(response.status).toBe(200);
    expect(authUser.passwordHash).toBe("new-password-hash");
    expect(TenantUser.updateMany).toHaveBeenCalledWith(
      { authUserId: "auth-1" },
      { $set: { password: "new-password-hash" } },
    );
  });

  it("reset preko TenantUser tokena prepisuje i vezani AuthUser", async () => {
    const tenantUser = {
      authUserId: "auth-2",
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
    expect(AuthUser.findByIdAndUpdate).toHaveBeenCalledWith("auth-2", {
      $set: { passwordHash: "new-password-hash" },
    });
  });

  it("AuthUser reset više nije ograđen na SUPER_ADMIN", async () => {
    vi.mocked(TenantUser.findOne).mockResolvedValue(null as never);
    vi.mocked(AuthUser.findOne).mockResolvedValue(null as never);

    await POST(request({ token: "t", newPassword: "NovaLozinka123" }));

    const filter = vi.mocked(AuthUser.findOne).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(filter).not.toHaveProperty("platformRole");
  });
});
