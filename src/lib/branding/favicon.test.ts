import { describe, expect, it } from "vitest";
import { faviconFingerprint, faviconPreviewUrl, faviconRequestUrl, faviconTransformUrl, monogramSvg, resolveTenantFavicon } from "./favicon";
import { validateFaviconFile } from "./faviconValidation";

const logo = "https://res.cloudinary.com/demo/image/upload/v1/logo.png";
const custom = "https://res.cloudinary.com/demo/image/upload/v2/icon.png";

describe("tenant favicon resolution", () => {
  it("custom wins over a main logo", () => expect(resolveTenantFavicon({ logo, favicon: { mode: "custom", customUrl: custom } })).toMatchObject({ kind: "custom", source: custom }));
  it("explicit monogram survives without any custom file", () => expect(resolveTenantFavicon({ name: "ASH Studio", logo, favicon: { mode: "monogram", customUrl: null } })).toMatchObject({ kind: "monogram", text: "AS" }));
  it("auto contains a normal logo", () => {
    const resolved = resolveTenantFavicon({ logo, favicon: { mode: "auto", sourceRatio: 1 } });
    expect(resolved.kind).toBe("auto");
    expect(faviconPreviewUrl(resolved)).toContain("c_fit/w_32,h_32,c_pad");
  });
  it("auto uses a monogram for a wide wordmark", () => expect(resolveTenantFavicon({ name: "ASH Studio", logo, favicon: { mode: "auto", sourceRatio: 2 } }).kind).toBe("monogram"));
  it("falls back to Marysoll when no logo exists", () => expect(resolveTenantFavicon({ name: "No logo" }).kind).toBe("platform"));
  it("keeps legacy logos without ratio in safe contain mode", () => expect(resolveTenantFavicon({ logo }).kind).toBe("auto"));
  it("ignores invalid stored custom URL without breaking the public page", () => expect(resolveTenantFavicon({ logo, favicon: { mode: "custom", customUrl: "javascript:alert(1)" } }).kind).toBe("auto"));
  it("sanitizes legacy SVG colors and initials", () => {
    const resolved = resolveTenantFavicon({ name: '<img src=x> Evil', favicon: { mode: "monogram", backgroundColor: 'red" onload="alert(1)' } });
    expect(resolved.kind).toBe("monogram");
    if (resolved.kind === "monogram") {
      const svg = monogramSvg(resolved);
      expect(svg).not.toContain("onload");
      expect(svg).not.toContain("<img");
      expect(svg).toContain('fill="#5b21b6"');
    }
  });
  it("shares resolver output with preview and versioned metadata URLs", () => {
    const first = resolveTenantFavicon({ logo, favicon: { mode: "auto", version: 7 } });
    const second = resolveTenantFavicon({ name: "ASH", favicon: { mode: "monogram" } });
    const third = resolveTenantFavicon({ favicon: { mode: "custom", customUrl: custom } });
    expect(faviconPreviewUrl(first)).toBe(faviconTransformUrl(logo, 32));
    expect(faviconPreviewUrl(second)).toMatch(/^data:image\/svg\+xml,/);
    expect(faviconPreviewUrl(third)).toBe(faviconTransformUrl(custom, 32));
    expect(faviconRequestUrl("/ash", first.version)).toBe("/ash/favicon.ico?size=32&v=7");
    expect(faviconRequestUrl("/anna", 1)).not.toBe(faviconRequestUrl("/ash", 1));
  });
  it("uses the same wide-logo rule for an unsaved draft preview", () => {
    const draft = { name: "ASH Studio", logo: "blob:http://localhost/draft", favicon: { mode: "auto" as const, sourceRatio: 2 } };
    expect(resolveTenantFavicon(draft, { draft: true }).kind).toBe("monogram");
    expect(resolveTenantFavicon({ ...draft, favicon: { mode: "auto", sourceRatio: 1 } }, { draft: true }).kind).toBe("auto");
  });
  it("ignores unrelated fields in version fingerprint", () => {
    const base = { name: "ASH", logo, favicon: { mode: "auto" as const } };
    expect(faviconFingerprint(base)).toBe(faviconFingerprint({ ...base, ...{ phone: "123" } }));
    expect(faviconFingerprint(base)).not.toBe(faviconFingerprint({ ...base, favicon: { mode: "monogram" } }));
  });
});

describe("favicon upload validation", () => {
  it("rejects oversized files", async () => expect(await validateFaviconFile(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "icon.png", { type: "image/png" }))).toMatch(/5 MB/));
  it("rejects spoofed MIME/extension and invalid bytes", async () => {
    expect(await validateFaviconFile(new File(["not an image"], "icon.png", { type: "image/png" }))).not.toBeNull();
    expect(await validateFaviconFile(new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "icon.jpg", { type: "image/jpeg" }))).not.toBeNull();
  });
  it("accepts a PNG with matching signature and MIME", async () => expect(await validateFaviconFile(new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "icon.png", { type: "image/png" }))).toBeNull());
});
