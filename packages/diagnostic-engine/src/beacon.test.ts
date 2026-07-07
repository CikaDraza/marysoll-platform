import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendDiagBeacon } from "./beacon";

describe("sendDiagBeacon", () => {
  const sendBeacon = vi.fn<(url: string, data?: string) => boolean>(() => true);

  beforeEach(() => {
    sendBeacon.mockClear();
    Object.defineProperty(navigator, "sendBeacon", {
      value: sendBeacon,
      configurable: true,
      writable: true,
    });
  });

  it("šalje payload sa label/pageHost/results na default endpoint", () => {
    sendDiagBeacon("dash-boot", { url: "/dashboard" });

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [endpoint, raw] = sendBeacon.mock.calls[0];
    expect(endpoint).toBe("/api/public/diag-report");
    const payload = JSON.parse(raw as string);
    expect(payload.label).toBe("dash-boot");
    expect(payload.pageHost).toBe(window.location.host);
    expect(payload.results[0].key).toBe("dash-boot");
    expect(payload.results[0].detail).toContain("/dashboard");
  });

  it("poštuje custom endpoint", () => {
    sendDiagBeacon("x", undefined, "/custom");
    expect(sendBeacon.mock.calls[0][0]).toBe("/custom");
  });

  it("NIKAD ne baca — ni kada sendBeacon ne postoji", () => {
    Object.defineProperty(navigator, "sendBeacon", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    expect(() => sendDiagBeacon("boom")).not.toThrow();
  });
});
