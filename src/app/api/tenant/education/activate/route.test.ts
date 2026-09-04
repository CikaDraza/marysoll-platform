import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/auth-server", () => ({ requireTenantAdmin: vi.fn() }));
vi.mock("@/lib/platform/education-provisioning", () => ({
  provisionEducationWorkspace: vi.fn(),
}));
vi.mock("@/lib/platform/capabilities-server", () => ({
  resolveTenantCapabilitySnapshot: vi.fn(),
}));

import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { resolveTenantCapabilitySnapshot } from "@/lib/platform/capabilities-server";
import { provisionEducationWorkspace } from "@/lib/platform/education-provisioning";
import { POST } from "./route";

const TENANT_ID = "tenant-a";
const snapshot = {
  verticals: ["beauty", "education"],
  capabilities: {
    "education.catalog": {
      capability: "education.catalog",
      enabled: true,
      platformAvailable: true,
      planEntitled: true,
      tenantEnabled: true,
    },
  },
};

function request(body?: Record<string, unknown>) {
  return new NextRequest("https://admin.marysoll.com/api/tenant/education/activate", {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireTenantAdmin).mockReturnValue({
    success: true,
    tenantId: TENANT_ID,
  });
  vi.mocked(provisionEducationWorkspace).mockResolvedValue(true);
  vi.mocked(resolveTenantCapabilitySnapshot).mockResolvedValue(snapshot as never);
});

describe("POST /api/tenant/education/activate", () => {
  it("aktivira Education na tenantu iz auth konteksta i vraća resolved snapshot", async () => {
    const response = await POST(request({ tenantId: "tenant-b" }));

    expect(response.status).toBe(200);
    expect(provisionEducationWorkspace).toHaveBeenCalledWith(TENANT_ID);
    expect(provisionEducationWorkspace).not.toHaveBeenCalledWith("tenant-b");
    expect(resolveTenantCapabilitySnapshot).toHaveBeenCalledWith(TENANT_ID);
    expect(await response.json()).toEqual({ success: true, snapshot });
  });

  it("ostaje uspešan pri ponovljenoj idempotentnoj aktivaciji", async () => {
    const first = await POST(request());
    const second = await POST(request());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(provisionEducationWorkspace).toHaveBeenCalledTimes(2);
    expect(await second.json()).toMatchObject({
      snapshot: {
        verticals: ["beauty", "education"],
        capabilities: { "education.catalog": { enabled: true } },
      },
    });
  });

  it("odbija ordinary client pre tenant mutation-a", async () => {
    vi.mocked(requireTenantAdmin).mockReturnValue({
      success: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(provisionEducationWorkspace).not.toHaveBeenCalled();
  });

  it("odbija tenant mismatch pre mutation-a", async () => {
    vi.mocked(requireTenantAdmin).mockReturnValue({
      success: false,
      response: NextResponse.json(
        { error: "Forbidden: tenant mismatch" },
        { status: 403 },
      ),
    });

    const response = await POST(request({ tenantId: "tenant-b" }));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: "Forbidden: tenant mismatch",
    });
    expect(provisionEducationWorkspace).not.toHaveBeenCalled();
  });

  it("vraća 404 kada auth-scoped tenant više ne postoji", async () => {
    vi.mocked(provisionEducationWorkspace).mockResolvedValue(false);

    const response = await POST(request());

    expect(response.status).toBe(404);
    expect(resolveTenantCapabilitySnapshot).not.toHaveBeenCalled();
  });
});
