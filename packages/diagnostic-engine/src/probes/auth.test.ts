import { afterEach, describe, expect, it, vi } from "vitest";
import {
  runLoginServiceProbe,
  runPasswordResetServiceProbe,
} from "./auth";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("auth service probes", () => {
  it("prihvata kontrolisano odbijanje nepostojećeg login naloga kao zdrav servis", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 403 }));

    const result = await runLoginServiceProbe("/api/auth/login");

    expect(result.state).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1];
    expect(init?.method).toBe("POST");
    expect(String(init?.body)).toContain("@account.invalid");
  });

  it("reset proba ne koristi stvaran nalog niti traži slanje emaila", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    const result = await runPasswordResetServiceProbe(
      "/api/auth/forgot-password",
    );

    expect(result.state).toBe("ok");
    expect(result.data).toMatchObject({
      emailDeliveryTested: false,
      testAccountUsed: false,
    });
    expect(String(fetchMock.mock.calls[0][1]?.body)).toContain(
      "@account.invalid",
    );
  });

  it("serversku grešku označava kao pad servisa", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    expect((await runLoginServiceProbe("/api/auth/login")).state).toBe("fail");
    expect(
      (await runPasswordResetServiceProbe("/api/auth/forgot-password")).state,
    ).toBe("fail");
  });
});
