import fs from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const MARYSOLL = "/marysoll_elegant_logo.png";

function loadPushHandler() {
  const listeners = new Map<string, (event: unknown) => void>();
  const self = {
    addEventListener: (name: string, handler: (event: unknown) => void) => {
      listeners.set(name, handler);
    },
    registration: { showNotification: vi.fn(async () => undefined) },
  };
  vm.runInNewContext(fs.readFileSync("public/service-worker.js", "utf8"), {
    self,
    clients: {},
  });
  return { handler: listeners.get("push")!, show: self.registration.showNotification };
}

describe("notification surface branding", () => {
  it.each([
    ["https://cdn.example.com/tenant.png", "https://cdn.example.com/tenant.png"],
    [undefined, MARYSOLL],
    ["https://cdn.example.com/tenant.svg", MARYSOLL],
    ["", MARYSOLL],
  ])("service worker koristi isti logo za icon i badge", (payloadIcon, expected) => {
    const { handler, show } = loadPushHandler();
    handler({
      data: { json: () => ({ title: "Test", icon: payloadIcon }) },
      waitUntil: (promise: Promise<unknown>) => promise,
    });
    expect(show).toHaveBeenCalledWith(
      "Test",
      expect.objectContaining({ icon: expected, badge: expected }),
    );
  });

  it("browser hook koristi notificationLogo, nikada site logo ili favicon", () => {
    const source = fs.readFileSync("src/hooks/useNotifications.ts", "utf8");
    const hook = source.slice(source.indexOf("export function useBrowserNotifications"));
    expect(hook).toContain("publicProfile?.notificationLogo");
    expect(hook).toContain("adminProfile?.notificationLogo");
    expect(hook).not.toMatch(/profile\?*\.logo|favicon\.ico/);
  });
});
