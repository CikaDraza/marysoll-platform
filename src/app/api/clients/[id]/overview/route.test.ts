import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const TENANT = "68f000000000000000000001";
const CLIENT = "68f000000000000000000002";
const auth = vi.fn();
const tenantUserFindOne = vi.fn();
const appointmentFind = vi.fn();
const testimonialFind = vi.fn();
const testimonialCount = vi.fn();
const loyaltyAccountFindOne = vi.fn();
const loyaltyLedgerFind = vi.fn();
const voucherFind = vi.fn();

vi.mock("@/lib/auth/auth-server", () => ({ requireTenantAdmin: (...args: unknown[]) => auth(...args) }));
vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn() }));
vi.mock("@/lib/plans/planEnforcement", () => ({ requireFeature: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/platform/capabilities-server", () => ({ resolveTenantCapability: vi.fn().mockResolvedValue({ enabled: true }) }));
vi.mock("@/lib/loyalty/config", () => ({ getLoyaltyConfig: vi.fn().mockResolvedValue({ enabled: true }) }));
vi.mock("@/models/TenantUser", () => ({ TenantUser: { findOne: (...args: unknown[]) => tenantUserFindOne(...args) } }));
vi.mock("@/models/Appointment", () => ({ Appointment: { find: (...args: unknown[]) => appointmentFind(...args) } }));
vi.mock("@/models/Testimonial", () => ({ Testimonial: {
  find: (...args: unknown[]) => testimonialFind(...args),
  countDocuments: (...args: unknown[]) => testimonialCount(...args),
} }));
vi.mock("@/models/LoyaltyAccount", () => ({ LoyaltyAccount: { findOne: (...args: unknown[]) => loyaltyAccountFindOne(...args) } }));
vi.mock("@/models/LoyaltyLedger", () => ({ LoyaltyLedger: { find: (...args: unknown[]) => loyaltyLedgerFind(...args) } }));
vi.mock("@/models/Voucher", () => ({ Voucher: { find: (...args: unknown[]) => voucherFind(...args) } }));

const leanResult = (value: unknown) => ({ lean: vi.fn().mockResolvedValue(value) });
const sortedLean = (value: unknown) => ({ sort: vi.fn(() => leanResult(value)) });
const limitedLean = (value: unknown) => ({
  sort: vi.fn(() => ({ limit: vi.fn(() => ({ select: vi.fn(() => leanResult(value)), lean: vi.fn().mockResolvedValue(value) })) })),
});

async function call() {
  const { GET } = await import("./route");
  return GET(new NextRequest(`http://localhost/api/clients/${CLIENT}/overview?month=9&year=2026`), {
    params: Promise.resolve({ id: CLIENT }),
  });
}

describe("Client 360 tenant boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockReturnValue({ success: true, tenantId: TENANT });
    tenantUserFindOne.mockReturnValue({
      select: vi.fn(() => leanResult({ _id: CLIENT, email: "client@example.com", name: "Client" })),
    });
    appointmentFind
      .mockReturnValueOnce(sortedLean([]))
      .mockReturnValueOnce({ populate: vi.fn(() => leanResult([])) });
    testimonialFind.mockReturnValue(limitedLean([]));
    testimonialCount.mockResolvedValue(0);
    loyaltyAccountFindOne.mockReturnValue(leanResult(null));
  });

  it("returns 401 without authentication", async () => {
    auth.mockReturnValue({ success: false, response: NextResponse.json({}, { status: 401 }) });
    expect((await call()).status).toBe(401);
    expect(tenantUserFindOne).not.toHaveBeenCalled();
  });

  it("returns 403 for a client token", async () => {
    auth.mockReturnValue({ success: false, response: NextResponse.json({}, { status: 403 }) });
    expect((await call()).status).toBe(403);
    expect(tenantUserFindOne).not.toHaveBeenCalled();
  });

  it("returns no data when the id belongs to another tenant", async () => {
    tenantUserFindOne.mockReturnValue({ select: vi.fn(() => leanResult(null)) });
    expect((await call()).status).toBe(404);
    expect(appointmentFind).not.toHaveBeenCalled();
  });

  it("returns same-tenant data and scopes appointments, testimonials and loyalty", async () => {
    const response = await call();
    expect(response.status).toBe(200);
    const clientFilter = tenantUserFindOne.mock.calls[0][0];
    expect(String(clientFilter.tenantId)).toBe(TENANT);
    expect(String(clientFilter._id)).toBe(CLIENT);
    for (const [filter] of appointmentFind.mock.calls) expect(String(filter.tenantId)).toBe(TENANT);
    expect(String(testimonialFind.mock.calls[0][0].tenantId)).toBe(TENANT);
    expect(String(testimonialFind.mock.calls[0][0].clientProfileId)).toBe(CLIENT);
    expect(String(loyaltyAccountFindOne.mock.calls[0][0].tenantId)).toBe(TENANT);
    expect(String(loyaltyAccountFindOne.mock.calls[0][0].tenantUserId)).toBe(CLIENT);
  });
});
