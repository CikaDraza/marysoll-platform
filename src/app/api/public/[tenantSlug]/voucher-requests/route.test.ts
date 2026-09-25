import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Types } from "mongoose";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn() }));
vi.mock("@/lib/email/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/email/templates/voucherRequestTemplate", () => ({ voucherRequestTemplate: vi.fn(async () => "<p>voucher</p>") }));
vi.mock("@/models/Tenant", () => ({ Tenant: { findOne: vi.fn() } }));
vi.mock("@/models/SalonProfile", () => ({ SalonProfile: { findOne: vi.fn() } }));
vi.mock("@/models/Service", () => ({ Service: { findOne: vi.fn() } }));
vi.mock("@/models/VoucherRequest", () => ({ VoucherRequest: { countDocuments: vi.fn(), create: vi.fn(), updateOne: vi.fn() } }));

import { sendEmail } from "@/lib/email/email";
import { Tenant } from "@/models/Tenant";
import { SalonProfile } from "@/models/SalonProfile";
import { Service } from "@/models/Service";
import { VoucherRequest } from "@/models/VoucherRequest";
import { POST } from "./route";

const tenantId = new Types.ObjectId("507f1f77bcf86cd799439011");
const serviceId = "6a329c9e71576c908b53e489";
const params = { params: Promise.resolve({ tenantSlug: "the-lash-room-by-anja" }) };
const input = { purchaserName: "Jovana", purchaserInstagram: "@jovana123", recipientName: "Milica", serviceId };

function request(body: object) {
  return new NextRequest("http://localhost/api/public/the-lash-room-by-anja/voucher-requests", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("voucher request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Tenant.findOne).mockReturnValue({ select: () => ({ lean: async () => ({ _id: tenantId, name: "Lash Room" }) }) } as never);
    vi.mocked(SalonProfile.findOne).mockReturnValue({ select: () => ({ lean: async () => ({
      name: "The Lash Room by Anja", bookingEmail: "anja@example.com",
      social: { instagram: "https://www.instagram.com/lashroom_byanja/" },
      landingStructure: { marketingBanners: [{ enabled: true, cta: { enabled: true, destination: { type: "modal" } } }] },
    }) }) } as never);
    vi.mocked(Service.findOne).mockReturnValue({ select: () => ({ lean: async () => ({ name: "Volumen tehnika", basePrice: 4300, priceMode: "fixed" }) }) } as never);
    vi.mocked(VoucherRequest.countDocuments).mockResolvedValue(0);
    vi.mocked(VoucherRequest.create).mockResolvedValue({ _id: new Types.ObjectId(), requestCode: "VR-84K2M" } as never);
    vi.mocked(VoucherRequest.updateOne).mockResolvedValue({} as never);
    vi.mocked(sendEmail).mockResolvedValue({ success: true });
  });

  it("reads the price from the tenant service and sends the owner's email", async () => {
    const response = await POST(request({ ...input, servicePriceAtRequest: 1 }), params);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      requestCode: "VR-84K2M", serviceName: "Volumen tehnika", notificationSent: true,
      dmUrl: "https://ig.me/m/lashroom_byanja", greetingName: "Anja",
    });
    expect(Service.findOne).toHaveBeenCalledWith({ _id: serviceId, tenantId });
    expect(VoucherRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId, purchaserInstagram: "@jovana123", servicePriceAtRequest: 4300,
    }));
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "anja@example.com" }));
  });

  it("keeps the saved request and offers DM if owner email fails", async () => {
    vi.mocked(sendEmail).mockRejectedValue(new Error("email unavailable"));
    const response = await POST(request(input), params);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ requestCode: "VR-84K2M", notificationSent: false });
    expect(VoucherRequest.updateOne).toHaveBeenCalledWith(expect.anything(), { $set: { notificationStatus: "failed" } });
  });

  it("refuses a request if no enabled banner opens the modal", async () => {
    vi.mocked(SalonProfile.findOne).mockReturnValue({ select: () => ({ lean: async () => ({
      name: "The Lash Room by Anja", bookingEmail: "anja@example.com",
      landingStructure: { marketingBanners: [] },
    }) }) } as never);
    const response = await POST(request(input), params);
    expect(response.status).toBe(404);
    expect(VoucherRequest.create).not.toHaveBeenCalled();
  });
});
