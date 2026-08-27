import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("@/lib/auth/auth-server", () => ({ verifyToken: vi.fn() }));
vi.mock("@/models/Notification", () => ({
  Notification: { deleteMany: vi.fn() },
}));

import { verifyToken } from "@/lib/auth/auth-server";
import { Notification } from "@/models/Notification";
import { DELETE } from "./route";

type NotificationRow = {
  id: string;
  tenantId: string;
  recipientProfileId: string;
  createdAt: Date;
};

const now = new Date("2026-08-27T12:00:00.000Z");
let rows: NotificationRow[];

function request(mode: "all" | "old") {
  return new Request(`https://marysoll.com/api/notifications/delete?mode=${mode}`, {
    method: "DELETE",
    headers: { authorization: "Bearer verified-token" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  rows = [
    { id: "A1", tenantId: "tenant-a", recipientProfileId: "admin-a", createdAt: new Date("2026-08-26") },
    { id: "A2", tenantId: "tenant-a", recipientProfileId: "admin-a", createdAt: new Date("2026-07-01") },
    { id: "B1", tenantId: "tenant-b", recipientProfileId: "admin-b", createdAt: new Date("2026-08-26") },
    { id: "B2", tenantId: "tenant-b", recipientProfileId: "admin-b", createdAt: new Date("2026-07-01") },
  ];

  vi.mocked(Notification.deleteMany).mockImplementation((async (query: unknown) => {
    const filter = query as {
      tenantId?: string;
      recipientProfileId?: string;
      createdAt?: { $lt: Date };
    };
    const before = rows.length;
    rows = rows.filter((row) => {
      const matchesRecipient = row.recipientProfileId === filter.recipientProfileId;
      const matchesTenant = !filter.tenantId || row.tenantId === filter.tenantId;
      const matchesAge = !filter.createdAt || row.createdAt < filter.createdAt.$lt;
      return !(matchesRecipient && matchesTenant && matchesAge);
    });
    return { acknowledged: true, deletedCount: before - rows.length };
  }) as never);
});

describe("DELETE /api/notifications/delete", () => {
  it("mode=all briše samo notifikacije tenant recipient-a", async () => {
    vi.mocked(verifyToken).mockReturnValue({
      id: "auth-a",
      tenantUserId: "admin-a",
      tenantId: "tenant-a",
      isAdmin: true,
    } as never);

    const response = await DELETE(request("all"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ deletedCount: 2 });
    expect(rows.map((row) => row.id)).toEqual(["B1", "B2"]);
    expect(Notification.deleteMany).toHaveBeenCalledWith({
      recipientProfileId: "admin-a",
      tenantId: "tenant-a",
    });
  });

  it("SUPER_ADMIN ostaje recipient-scoped i bez tenantId-a", async () => {
    rows.push(
      { id: "S1", tenantId: "platform", recipientProfileId: "super-a", createdAt: new Date("2026-08-26") },
      { id: "S2", tenantId: "platform", recipientProfileId: "super-b", createdAt: new Date("2026-08-26") },
    );
    vi.mocked(verifyToken).mockReturnValue({
      id: "super-a",
      tenantUserId: null,
      tenantId: null,
      isAdmin: true,
      isSuperAdmin: true,
    } as never);

    const response = await DELETE(request("all"));

    expect(await response.json()).toMatchObject({ deletedCount: 1 });
    expect(rows.map((row) => row.id)).toContain("S2");
    expect(rows.map((row) => row.id)).toEqual(expect.arrayContaining(["A1", "A2", "B1", "B2"]));
    expect(Notification.deleteMany).toHaveBeenCalledWith({
      recipientProfileId: "super-a",
    });
  });

  it("mode=old zadržava recipient-ove zapise mlađe od 30 dana", async () => {
    vi.mocked(verifyToken).mockReturnValue({
      id: "auth-a",
      tenantUserId: "admin-a",
      tenantId: "tenant-a",
      isAdmin: true,
    } as never);

    const response = await DELETE(request("old"));

    expect(await response.json()).toMatchObject({ deletedCount: 1 });
    expect(rows.map((row) => row.id)).toEqual(["A1", "B1", "B2"]);
  });
});
