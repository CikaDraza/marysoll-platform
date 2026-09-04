import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { ClientOverview } from "@/types/client-overview";

const TENANT = "68f000000000000000000001";
const CLIENT = "68f000000000000000000002";
const auth = vi.fn();
const resolveFeatures = vi.fn();
const getOverview = vi.fn();

vi.mock("@/lib/auth/auth-server", () => ({ requireTenantAdmin: (...args: unknown[]) => auth(...args) }));
vi.mock("@/lib/plans/planEnforcement", () => ({ resolveTenantPlanFeatures: (...args: unknown[]) => resolveFeatures(...args) }));
vi.mock("@/lib/clients/clientOverview", () => ({ getClientOverview: (...args: unknown[]) => getOverview(...args) }));

const overview: ClientOverview = {
  period: { month: 9, year: 2026 },
  client: { id: CLIENT, name: "Client", email: "client@example.com", birthday: null, status: "active", isEmailVerified: true, createdAt: "2026-01-01T00:00:00.000Z", lastActive: null },
  appointments: { items: [], pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } },
  insights: { available: true, total: 0, potential: 0, realized: 0, completed: 0, cancelled: 0, noShow: 0, testimonialCount: 0, lastVisit: null, nextAppointment: null, topThree: false, withoutPrice: 0, topClients: [] },
  loyalty: { enabled: false },
  testimonials: { items: [], totalCount: 0 },
};

async function call(query = "month=9&year=2026") {
  const { GET } = await import("./route");
  return GET(new NextRequest(`http://localhost/api/clients/${CLIENT}/overview?${query}`), { params: Promise.resolve({ id: CLIENT }) });
}

describe("Client 360 route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockReturnValue({ success: true, tenantId: TENANT });
    resolveFeatures.mockResolvedValue({ features: { appointments: true, statistics: true } });
    getOverview.mockResolvedValue(overview);
  });

  it("returns the authentication response without reading data", async () => {
    auth.mockReturnValue({ success: false, response: NextResponse.json({}, { status: 401 }) });
    expect((await call()).status).toBe(401);
    expect(getOverview).not.toHaveBeenCalled();
  });

  it("validates query parameters before executing the read model", async () => {
    expect((await call("month=13&year=2026")).status).toBe(400);
    expect(getOverview).not.toHaveBeenCalled();
  });

  it("returns 404 when the tenant-scoped read model cannot find the client", async () => {
    getOverview.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
  });

  it("passes tenant, pagination and feature capability to the read model", async () => {
    const response = await call("month=9&year=2026&appointmentPage=2&appointmentLimit=5");
    expect(response.status).toBe(200);
    expect(resolveFeatures).toHaveBeenCalledWith(TENANT);
    expect(getOverview).toHaveBeenCalledWith({
      tenantId: TENANT,
      clientId: CLIENT,
      query: { month: 9, year: 2026, appointmentPage: 2, appointmentLimit: 5 },
      insightsAllowed: true,
    });
  });

  it("normalizes legacy null social fields before returning the DTO", async () => {
    getOverview.mockResolvedValue({
      ...overview,
      client: { ...overview.client, instagram: null, tiktok: null },
    });
    const response = await call();
    expect(response.status).toBe(200);
    expect((await response.json()).client).toMatchObject({ id: CLIENT, name: "Client" });
  });

  it("denies plans without appointments", async () => {
    resolveFeatures.mockResolvedValue({ features: { appointments: false, statistics: true } });
    expect((await call()).status).toBe(403);
    expect(getOverview).not.toHaveBeenCalled();
  });
});
