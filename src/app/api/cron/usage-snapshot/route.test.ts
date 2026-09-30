import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { refreshPlatformUsage } = vi.hoisted(() => ({
  refreshPlatformUsage: vi.fn(),
}));
vi.mock("@/lib/superadmin/platformUsage", () => ({ refreshPlatformUsage }));
import { GET } from "./route";

const request = () =>
  new NextRequest("http://localhost/api/cron/usage-snapshot", {
    headers: { authorization: "Bearer usage-test-secret" },
  });

describe("daily usage capture", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "usage-test-secret");
    refreshPlatformUsage.mockReset();
  });

  it("runs at 21:10 UTC", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      crons: Array<{ path: string; schedule: string }>;
    };
    expect(
      config.crons.find((job) => job.path === "/api/cron/usage-snapshot")
        ?.schedule,
    ).toBe("10 21 * * *");
  });

  it("rejects incomplete tenant history instead of returning ok:true", async () => {
    refreshPlatformUsage.mockResolvedValueOnce({
      capture: {
        captureId: "capture-1",
        status: "partial",
        tenantHistoryCount: 0,
        providers: {
          mongodb: "ok",
          cloudinary: "ok",
          tenantUsage: "failed",
          history: "ok",
        },
      },
    });
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false });
  });

  it("returns success only for a complete correlated capture", async () => {
    refreshPlatformUsage.mockResolvedValueOnce({
      capture: {
        captureId: "capture-2",
        status: "complete",
        tenantHistoryCount: 3,
        providers: {
          mongodb: "ok",
          cloudinary: "ok",
          tenantUsage: "ok",
          history: "ok",
        },
      },
      tenantUsage: { syncedAt: "2026-10-01T21:10:00.000Z" },
    });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, tenants: 3 });
  });
});
