/**
 * Collectori se testiraju u happy-dom okruženju — asertacije su na STRUKTURU
 * (kontrakt) i pravilo "nikad ne baca", ne na tačne vrednosti okruženja.
 */
import { describe, it, expect } from "vitest";
import { collectDevice } from "./device";
import { collectPushSupport } from "./push";
import { collectStorage } from "./storage";
import { collectPermissions } from "./permissions";
import { DETAIL_MAX } from "../types";

describe("collectDevice", () => {
  it("vraća info sa device podacima, ne baca", () => {
    const r = collectDevice();
    expect(r.key).toBe("device");
    expect(r.state).toBe("info");
    expect(r.data).toBeDefined();
    expect(typeof r.data!.userAgent).toBe("string");
    expect(typeof r.data!.hasNotificationGlobal).toBe("boolean");
    expect(typeof r.data!.viewport).toBe("string");
    expect((r.detail ?? "").length).toBeLessThanOrEqual(DETAIL_MAX);
  });
});

describe("collectPushSupport", () => {
  it("vraća ok/warn sa support flagovima, ne baca", () => {
    const r = collectPushSupport();
    expect(r.key).toBe("push");
    expect(["ok", "warn"]).toContain(r.state);
    expect(typeof r.data!.hasNotification).toBe("boolean");
    expect(typeof r.data!.hasServiceWorker).toBe("boolean");
    expect(typeof r.data!.hasPushManager).toBe("boolean");
  });
});

describe("collectStorage", () => {
  it("localStorage u happy-dom radi → nije fail, ne baca", async () => {
    const r = await collectStorage();
    expect(r.key).toBe("storage");
    expect(["ok", "warn"]).toContain(r.state);
    expect(r.data!.localStorage).toBe("ok");
    expect(r.data!.sessionStorage).toBe("ok");
  });
});

describe("collectPermissions", () => {
  it("vraća info/warn i po dozvoli status ili 'n/a', ne baca", async () => {
    const r = await collectPermissions();
    expect(r.key).toBe("permissions");
    expect(["info", "warn"]).toContain(r.state);
    if (r.data) {
      for (const v of Object.values(r.data)) {
        expect(["granted", "denied", "prompt", "n/a"]).toContain(v);
      }
    }
  });
});
