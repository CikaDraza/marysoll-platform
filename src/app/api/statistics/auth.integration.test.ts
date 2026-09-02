/**
 * Statistika je poslovni podatak salona.
 *
 * Ruta je radila `if (tenantId)` na obe provere. Bez tokena je `tenantId` bio
 * `null`, pa su PRESKAKANI i plan gate i tenant filter — neautentifikovan
 * poziv vraćao je statistiku SVIH salona na platformi.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyToken = vi.fn();
const getTokenFromRequest = vi.fn();

vi.mock("@/lib/auth/auth-server", () => ({
  verifyToken: (...a: unknown[]) => verifyToken(...a),
  getTokenFromRequest: (...a: unknown[]) => getTokenFromRequest(...a),
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
    getTokenFromRequest.mockReturnValue(null);
    verifyToken.mockReturnValue(null);
    const res = await callRoute();
    expect(res.status).toBe(401);
  });

  it("nevalidan token → 401", async () => {
    getTokenFromRequest.mockReturnValue("bad");
    verifyToken.mockReturnValue(null);
    const res = await callRoute();
    expect(res.status).toBe(401);
  });

  it("KLIJENT → 403, statistika nije njegov podatak", async () => {
    getTokenFromRequest.mockReturnValue("t");
    verifyToken.mockReturnValue({
      id: "u1",
      isAdmin: false,
      tenantId: "68f000000000000000000001",
      tenantUserId: "68f000000000000000000002",
    });
    const res = await callRoute();
    expect(res.status).toBe(403);
  });

  it("admin bez tenant konteksta → 403", async () => {
    getTokenFromRequest.mockReturnValue("t");
    verifyToken.mockReturnValue({ id: "u1", isAdmin: true });
    const res = await callRoute();
    expect(res.status).toBe(403);
  });
});
