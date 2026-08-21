import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn() }));
vi.mock("@/lib/auth/auth-server", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/platform/capabilities-server", () => ({
  requireCapability: vi.fn(),
}));
vi.mock("@/models/Service", () => ({ Service: { create: vi.fn() } }));
vi.mock("@/lib/marketplace/revalidateMarketplace", () => ({
  revalidateMarketplaceCaches: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth/auth-server";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { Service } from "@/models/Service";
import { POST } from "./route";

describe("POST /api/services/create capability gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("direktan zahtev sa skrivenim UI-jem ne može zaobići server gate", async () => {
    vi.mocked(requireAdmin).mockReturnValue({
      success: true,
      decoded: { tenantId: "507f1f77bcf86cd799439011" },
    } as never);
    vi.mocked(requireCapability).mockResolvedValue(
      NextResponse.json({ error: "Funkcionalnost nije uključena" }, { status: 403 }),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/services/create", {
        method: "POST",
        body: JSON.stringify({ name: "Test", category: "Test", type: "single" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(requireCapability).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      "services.catalog",
    );
    expect(Service.create).not.toHaveBeenCalled();
  });

  it("capability se ne proverava pre postojeće permission provere", async () => {
    const forbidden = NextResponse.json({ error: "Nemate administratorska prava" }, { status: 403 });
    vi.mocked(requireAdmin).mockReturnValue({ success: false, response: forbidden });

    const response = await POST(
      new NextRequest("http://localhost/api/services/create", { method: "POST" }),
    );

    expect(response.status).toBe(403);
    expect(requireCapability).not.toHaveBeenCalled();
  });
});
