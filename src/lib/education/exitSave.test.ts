import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveEducationDraftOnExit } from "./exitSave";

const fetchMock = vi.fn();

function installBrowser(token: string | null) {
  vi.stubGlobal("window", {
    localStorage: { getItem: () => token },
  });
  vi.stubGlobal("fetch", fetchMock);
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true });
  installBrowser("token-123");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("čuvanje pri napuštanju strane", () => {
  it("šalje izmene sa `keepalive`, da ih gašenje kartice ne prekine", () => {
    expect(saveEducationDraftOnExit("abc", { title: "Estetika lica" })).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/education/content/abc");
    expect(init).toMatchObject({
      method: "PATCH",
      keepalive: true,
      headers: { Authorization: "Bearer token-123" },
    });
    expect(JSON.parse(init.body)).toEqual({ title: "Estetika lica" });
  });

  it("ne šalje ništa kad nema izmena", () => {
    expect(saveEducationDraftOnExit("abc", {})).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ne šalje ništa bez tokena — anoniman zahtev bi ionako bio odbijen", () => {
    installBrowser(null);

    expect(saveEducationDraftOnExit("abc", { title: "X" })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("na serveru ne radi ništa", () => {
    vi.unstubAllGlobals();

    expect(saveEducationDraftOnExit("abc", { title: "X" })).toBe(false);
  });

  it("greška pri slanju ne ruši gašenje strane", () => {
    fetchMock.mockImplementation(() => {
      throw new Error("network down");
    });

    expect(() => saveEducationDraftOnExit("abc", { title: "X" })).not.toThrow();
  });

  it("nosi podatke o redosledu, da ne pregazi novije čuvanje", () => {
    saveEducationDraftOnExit("abc", {
      title: "Poslednji pasus",
      saveOrder: { sessionId: "s1", revision: 7 },
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      saveOrder: { sessionId: "s1", revision: 7 },
    });
  });
});
