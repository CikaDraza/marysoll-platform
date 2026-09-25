import { describe, expect, it } from "vitest";
import { instagramDmUrl, isInstagramDmLink, voucherDmMessage } from "./theme8Voucher";
import { voucherRequestInputSchema } from "@/lib/theme8/voucher-validation";

describe("Theme-8 voucher and DM helpers", () => {
  it("uses the salon Instagram profile for a safe DM URL", () => {
    expect(instagramDmUrl("https://www.instagram.com/lashroom_byanja/"))
      .toBe("https://ig.me/m/lashroom_byanja");
    expect(isInstagramDmLink("https://ig.me/m/lashroom_byanja")).toBe(true);
    expect(isInstagramDmLink("https://instagram.com/p/123")).toBe(false);
    expect(instagramDmUrl("https://evil.example/lashroom_byanja")).toBeNull();
  });

  it("validates names, Instagram handle and selected service ID", () => {
    expect(voucherRequestInputSchema.safeParse({
      purchaserName: "Jovana", purchaserInstagram: "@jovana123",
      recipientName: "Milica", serviceId: "6a329c9e71576c908b53e489",
    }).success).toBe(true);
    expect(voucherRequestInputSchema.safeParse({
      purchaserName: "Jovana", purchaserInstagram: "@bad handle",
      recipientName: "Milica", serviceId: "x",
    }).success).toBe(false);
  });

  it("builds the copyable DM message with the saved request code", () => {
    expect(voucherDmMessage({
      greetingName: "Anja", purchaserName: "Jovana", recipientName: "Milica",
      serviceName: "Volumen tehnika", requestCode: "VR-84K2M",
    })).toContain("Tehnika: Volumen tehnika\nZahtev: VR-84K2M");
  });
});
