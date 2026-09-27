/**
 * Statistika je poslovni podatak salona.
 *
 * Ruta je radila `if (tenantId)` na obe provere. Bez tokena je `tenantId` bio
 * `null`, pa su PRESKAKANI i plan gate i tenant filter — neautentifikovan
 * poziv vraćao je statistiku SVIH salona na platformi.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const requireAdmin = vi.fn();

vi.mock("@/lib/auth/auth-server", () => ({
  requireAdmin: (...a: unknown[]) => requireAdmin(...a),
}));
vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn() }));
vi.mock("@/lib/plans/requireFeature", () => ({ requireFeature: vi.fn() }));

const req = () =>
  ({ url: "http://x/api/statistics?month=9&year=2026" }) as never;

async function callRoute() {
  const { GET } = await import("./route");
  return GET(req());
}

describe("autorizacija /api/statistics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("bez tokena → 401", async () => {
    requireAdmin.mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await callRoute();
    expect(res.status).toBe(401);
  });

  it("nevalidan token → 401", async () => {
    requireAdmin.mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: "Invalid token" }, { status: 401 }),
    });
    const res = await callRoute();
    expect(res.status).toBe(401);
  });

  it("KLIJENT → 403, statistika nije njegov podatak", async () => {
    requireAdmin.mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
    const res = await callRoute();
    expect(res.status).toBe(403);
  });

  it("admin bez tenant konteksta → 403", async () => {
    requireAdmin.mockResolvedValue({
      success: true,
      decoded: { id: "u1", isAdmin: true, tenantId: null },
      membership: null,
    });
    const res = await callRoute();
    expect(res.status).toBe(403);
  });

  it("STAFF → 403 iako ima backoffice pristup", async () => {
    requireAdmin.mockResolvedValue({
      success: false,
      response: NextResponse.json(
        { error: "Read only", code: "STAFF_READ_ONLY" },
        { status: 403 },
      ),
    });
    const res = await callRoute();
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({
      code: "STAFF_READ_ONLY",
    });
  });
});
