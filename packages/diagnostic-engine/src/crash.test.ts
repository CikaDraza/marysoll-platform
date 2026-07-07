import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { attachCrashReporter } from "./crash";

type BeaconMock = ReturnType<typeof vi.fn<(url: string, data?: string) => boolean>>;

function labelsSent(sendBeacon: BeaconMock): string[] {
  return sendBeacon.mock.calls.map(
    (c) => (JSON.parse(c[1] as string) as { label: string }).label,
  );
}

describe("attachCrashReporter", () => {
  const sendBeacon: BeaconMock = vi.fn<(url: string, data?: string) => boolean>(
    () => true,
  );

  beforeEach(() => {
    sendBeacon.mockClear();
    vi.useFakeTimers();
    Object.defineProperty(navigator, "sendBeacon", {
      value: sendBeacon,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("šalje {scope}-boot odmah i {scope}-alive posle 5s", () => {
    const cleanup = attachCrashReporter("dash");
    expect(labelsSent(sendBeacon)).toEqual(["dash-boot"]);

    vi.advanceTimersByTime(5000);
    expect(labelsSent(sendBeacon)).toEqual(["dash-boot", "dash-alive"]);
    cleanup();
  });

  it("hvata window error kao {scope}-error sa porukom", () => {
    const cleanup = attachCrashReporter("dash");
    window.dispatchEvent(
      new ErrorEvent("error", {
        message: "Notification is not defined",
        error: new Error("Notification is not defined"),
      }),
    );

    const labels = labelsSent(sendBeacon);
    expect(labels).toContain("dash-error");
    const errorCall = sendBeacon.mock.calls[labels.indexOf("dash-error")];
    const payload = JSON.parse(errorCall[1] as string);
    expect(payload.results[0].detail).toContain("Notification is not defined");
    cleanup();
  });

  it("cleanup skida listenere i alive tajmer", () => {
    const cleanup = attachCrashReporter("dash");
    cleanup();
    sendBeacon.mockClear();

    window.dispatchEvent(new ErrorEvent("error", { message: "posle cleanup" }));
    vi.advanceTimersByTime(10_000);
    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
