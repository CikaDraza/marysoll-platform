import { describe, it, expect, vi, afterEach } from "vitest";
import { buildNetworkProbes, runNetworkProbe } from "./network";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("buildNetworkProbes", () => {
  it("localhost → samo lokalni probe", () => {
    const probes = buildNetworkProbes("marysoll.com", "localhost");
    expect(probes).toHaveLength(1);
    expect(probes[0].key).toBe("local");
    expect(probes[0].url).toBe("/api/public/ping");
  });

  it("produkcija → base/admin/superadmin/wildcard/internet", () => {
    const probes = buildNetworkProbes("marysoll.com", "marysoll.com");
    expect(probes.map((p) => p.key)).toEqual([
      "base",
      "admin",
      "superadmin",
      "wildcard",
      "internet",
    ]);
    expect(probes[1].url).toBe("https://admin.marysoll.com/api/public/ping");
    expect(probes[4].noCors).toBe(true);
    expect(probes.every((p) => p.state === "pending")).toBe(true);
  });
});

describe("runNetworkProbe", () => {
  const probe = {
    key: "base",
    name: "Marysoll sajt",
    url: "https://marysoll.com/api/public/ping",
    state: "pending" as const,
    ms: null,
    detail: null,
  };

  it("HTTP 200 → ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 })),
    );
    const res = await runNetworkProbe(probe);
    expect(res.state).toBe("ok");
    expect(res.detail).toBe("HTTP 200");
    expect(res.ms).not.toBeNull();
  });

  it("HTTP 500 → fail sa statusom", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    const res = await runNetworkProbe(probe);
    expect(res.state).toBe("fail");
    expect(res.detail).toBe("HTTP 500");
  });

  it("no-cors opaque odgovor → ok (sam uspeh konekcije)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 })),
    );
    const res = await runNetworkProbe({ ...probe, noCors: true });
    expect(res.state).toBe("ok");
    expect(res.detail).toBe("konekcija uspešna");
  });

  it("odbijena konekcija → fail sa imenom greške", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const res = await runNetworkProbe(probe);
    expect(res.state).toBe("fail");
    expect(res.detail).toContain("odbijena/blokirana");
    expect(res.detail).toContain("TypeError");
  });

  it("timeout (abort) → fail 'isteklo vreme'", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      ),
    );
    const pending = runNetworkProbe(probe, 8000);
    await vi.advanceTimersByTimeAsync(8000);
    const res = await pending;
    expect(res.state).toBe("fail");
    expect(res.detail).toContain("isteklo vreme");
  });
});
