import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email/wrapEmailLayout", () => ({
  wrapEmailLayout: vi.fn(async ({ content }: { content: string }) => content),
}));

import { voucherRequestTemplate } from "./voucherRequestTemplate";

describe("voucher owner email", () => {
  it("includes the purchaser, service snapshot, payment and pickup terms", async () => {
    const html = await voucherRequestTemplate({
      purchaserName: "Jovana", purchaserInstagram: "@jovana123",
      recipientName: "Milica", serviceName: "Volumen tehnika",
      servicePriceAtRequest: 4300, requestCode: "VR-84K2M",
    });
    expect(html).toContain("Jovana");
    expect(html).toContain("@jovana123");
    expect(html).toContain("Milica");
    expect(html).toContain("Volumen tehnika");
    expect(html).toContain("4.300 RSD");
    expect(html).toContain("Lično u salonu");
    expect(html).toContain("Bez vremenskog ograničenja");
    expect(html).toContain("VR-84K2M");
  });

  it("escapes user-supplied text before adding it to HTML", async () => {
    const html = await voucherRequestTemplate({
      purchaserName: "<script>", purchaserInstagram: "@jovana",
      recipientName: "Milica", serviceName: "Volumen",
      servicePriceAtRequest: 4300, requestCode: "VR-84K2M",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
