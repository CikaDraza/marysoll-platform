/**
 * proxy.test.ts — sigurnosna mreža za rutiranje proxy pipeline-a.
 *
 * Matrica host × putanja → očekivana akcija (pass / rewrite / redirect),
 * uključujući sve preview slučajeve otkrivene 2026-07-05 (IS_PROD gate,
 * path-based rewrite, kanonski redirect, Deployment Protection bypass)
 * + debug trace (x-proxy-trace).
 *
 * IS_PROD, BASE_DOMAIN i VERCEL_BYPASS_HEADERS se čitaju pri IMPORTU modula,
 * pa svaki slučaj radi vi.resetModules() + stub env + svež dynamic import.
 * Interni fetch-evi (resolve-tenant/resolve-domain) su mockovani.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TENANTS: Record<
  string,
  { id: string; slug: string; customDomain: string | null }
> = {
  "kiki-kiss-beauty": {
    id: "t-kiki",
    slug: "kiki-kiss-beauty",
    customDomain: "kikikiss.beauty",
  },
  "no-domain-salon": {
    id: "t-nodomain",
    slug: "no-domain-salon",
    customDomain: null,
  },
};

const DOMAINS: Record<string, { id: string; slug: string }> = {
  "kikikiss.beauty": { id: "t-kiki", slug: "kiki-kiss-beauty" },
};

type FetchCall = { url: URL; headers: Record<string, string> };

function installFetchMock(calls: FetchCall[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      const headers: Record<string, string> = {};
      new Headers(init?.headers).forEach((v, k) => (headers[k] = v));
      calls.push({ url, headers });

      if (url.pathname === "/api/internal/resolve-tenant") {
        const t = TENANTS[url.searchParams.get("slug") ?? ""];
        return t
          ? Response.json({ id: t.id, slug: t.slug, customDomain: t.customDomain })
          : new Response("not found", { status: 404 });
      }
      if (url.pathname === "/api/internal/resolve-domain") {
        const d = DOMAINS[url.searchParams.get("domain") ?? ""];
        return d
          ? Response.json({ id: d.id, slug: d.slug, customDomain: url.searchParams.get("domain") })
          : new Response("not found", { status: 404 });
      }
      return new Response("unmocked fetch: " + url.pathname, { status: 500 });
    }),
  );
}

// ─── Harness ──────────────────────────────────────────────────────────────────

interface RunOptions {
  nodeEnv?: "production" | "development";
  bypassSecret?: string;
}

async function runProxy(
  host: string,
  path: string,
  opts: RunOptions = {},
): Promise<{ res: Response; calls: FetchCall[] }> {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", opts.nodeEnv ?? "production");
  vi.stubEnv("NEXT_PUBLIC_BASE_DOMAIN", "marysoll.com");
  vi.stubEnv("INTERNAL_API_SECRET", "test-secret");
  if (opts.bypassSecret) {
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", opts.bypassSecret);
  } else {
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", "");
  }

  const calls: FetchCall[] = [];
  installFetchMock(calls);

  const { proxy } = await import("@/proxy");
  // proxy čita hostname iz "host" HEADERA (ne iz URL-a) — kao i Vercel runtime
  const req = new NextRequest(`https://${host}${path}`, {
    headers: { host },
  });
  const res = await proxy(req);
  return { res, calls };
}

/** Putanja iz x-middleware-rewrite headera (ili null ako nema rewrite-a). */
function rewritePath(res: Response): string | null {
  const raw = res.headers.get("x-middleware-rewrite");
  return raw ? new URL(raw).pathname : null;
}

/** Prosleđeni request header (NextResponse ih enkodira u response). */
function forwardedHeader(res: Response, name: string): string | null {
  return res.headers.get(`x-middleware-request-${name}`);
}

function isPass(res: Response): boolean {
  return (
    res.headers.get("x-middleware-next") === "1" &&
    !res.headers.get("x-middleware-rewrite")
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ─── Marketing (osnovni domen) ────────────────────────────────────────────────

describe("marketing domen (marysoll.com)", () => {
  it("početna prolazi bez rewrite-a", async () => {
    const { res } = await runProxy("marysoll.com", "/");
    expect(isPass(res)).toBe(true);
  });

  it("rezervisan segment (/login) ostaje marketing", async () => {
    const { res } = await runProxy("marysoll.com", "/login");
    expect(isPass(res)).toBe(true);
    expect(forwardedHeader(res, "x-domain-type")).toBe("marketing");
  });

  it("PROD: path-based tenant ruta je blokirana (→ /not-found)", async () => {
    const { res } = await runProxy("marysoll.com", "/kiki-kiss-beauty");
    expect(rewritePath(res)).toBe("/not-found");
  });

  it("direktan pristup /tenant/* van client domena → /not-found", async () => {
    const { res } = await runProxy("marysoll.com", "/tenant/termini");
    expect(rewritePath(res)).toBe("/not-found");
  });
});

// ─── Vercel preview (*.vercel.app) ────────────────────────────────────────────

describe("vercel preview (path-based tenant)", () => {
  const HOST = "marysoll-platform-git-grana-team.vercel.app";

  it("/{slug} → rewrite /tenant + tenant headeri + base-path", async () => {
    const { res } = await runProxy(HOST, "/kiki-kiss-beauty");
    expect(rewritePath(res)).toBe("/tenant");
    expect(forwardedHeader(res, "x-tenant-slug")).toBe("kiki-kiss-beauty");
    expect(forwardedHeader(res, "x-tenant-id")).toBe("t-kiki");
    expect(forwardedHeader(res, "x-tenant-base-path")).toBe(
      "/kiki-kiss-beauty",
    );
  });

  it("/{slug}/termini → rewrite /tenant/termini", async () => {
    const { res } = await runProxy(HOST, "/kiki-kiss-beauty/termini");
    expect(rewritePath(res)).toBe("/tenant/termini");
  });

  it("/{slug}/blog/post → rewrite /tenant/blogs/blog/post", async () => {
    const { res } = await runProxy(HOST, "/kiki-kiss-beauty/blog/post");
    expect(rewritePath(res)).toBe("/tenant/blogs/blog/post");
  });

  it("NE šalje kanonski 301 na custom domen (preview nije host-based)", async () => {
    const { res } = await runProxy(HOST, "/kiki-kiss-beauty");
    expect(res.status).not.toBe(301);
    expect(res.headers.get("location")).toBeNull();
  });

  it("nepostojeći slug → /not-found (tenant bez ID-a je bezbednosna rupa)", async () => {
    const { res } = await runProxy(HOST, "/nepostojeci-salon");
    expect(rewritePath(res)).toBe("/not-found");
  });

  it("interni resolve fetch nosi bypass header kad secret postoji", async () => {
    const { calls } = await runProxy(HOST, "/kiki-kiss-beauty", {
      bypassSecret: "bypass-123",
    });
    const resolveCall = calls.find((c) =>
      c.url.pathname.startsWith("/api/internal/resolve-tenant"),
    );
    expect(resolveCall).toBeDefined();
    expect(resolveCall!.headers["x-vercel-protection-bypass"]).toBe(
      "bypass-123",
    );
    expect(resolveCall!.headers["x-internal-secret"]).toBe("test-secret");
  });

  it("bez secreta NE šalje bypass header", async () => {
    const { calls } = await runProxy(HOST, "/kiki-kiss-beauty");
    const resolveCall = calls.find((c) =>
      c.url.pathname.startsWith("/api/internal/resolve-tenant"),
    );
    expect(resolveCall!.headers["x-vercel-protection-bypass"]).toBeUndefined();
  });
});

// ─── Localhost dev (path-based) ───────────────────────────────────────────────

// ─── Staging apex (qa/staging.marysoll.com) — path-based tenant ───────────────

describe("staging apex (qa/staging.marysoll.com, path-based tenant)", () => {
  it("qa.marysoll.com/{slug} → rewrite /tenant + tenant headeri + base-path", async () => {
    const { res } = await runProxy("qa.marysoll.com", "/kiki-kiss-beauty");
    expect(rewritePath(res)).toBe("/tenant");
    expect(forwardedHeader(res, "x-domain-type")).toBe("client");
    expect(forwardedHeader(res, "x-tenant-slug")).toBe("kiki-kiss-beauty");
    expect(forwardedHeader(res, "x-tenant-base-path")).toBe("/kiki-kiss-beauty");
  });

  it("qa.marysoll.com/ (apex) → marketing, NE tenant 'qa'", async () => {
    const { res } = await runProxy("qa.marysoll.com", "/");
    expect(forwardedHeader(res, "x-domain-type")).toBe("marketing");
    expect(forwardedHeader(res, "x-tenant-slug")).toBe("");
    expect(rewritePath(res)).toBeNull();
  });

  it("staging.marysoll.com/{slug}/termini → rewrite /tenant/termini", async () => {
    const { res } = await runProxy(
      "staging.marysoll.com",
      "/kiki-kiss-beauty/termini",
    );
    expect(rewritePath(res)).toBe("/tenant/termini");
    expect(forwardedHeader(res, "x-tenant-base-path")).toBe("/kiki-kiss-beauty");
  });
});

describe("localhost dev (path-based tenant)", () => {
  it("/{slug}/usluge → rewrite /tenant/usluge + base-path", async () => {
    const { res } = await runProxy("localhost:3006", "/kiki-kiss-beauty/usluge", {
      nodeEnv: "development",
    });
    expect(rewritePath(res)).toBe("/tenant/usluge");
    expect(forwardedHeader(res, "x-tenant-base-path")).toBe(
      "/kiki-kiss-beauty",
    );
  });
});

// ─── Tenant subdomen ──────────────────────────────────────────────────────────

describe("tenant subdomen (host-based)", () => {
  it("bez custom domena: / → rewrite /tenant (bez base-path prefiksa)", async () => {
    const { res } = await runProxy("no-domain-salon.marysoll.com", "/");
    expect(rewritePath(res)).toBe("/tenant");
    expect(forwardedHeader(res, "x-tenant-slug")).toBe("no-domain-salon");
    expect(forwardedHeader(res, "x-tenant-base-path")).toBe("");
  });

  it("bez custom domena: /termini → rewrite /tenant/termini", async () => {
    const { res } = await runProxy("no-domain-salon.marysoll.com", "/termini");
    expect(rewritePath(res)).toBe("/tenant/termini");
  });

  it("legacy /blog → rewrite /tenant/blogs/blog", async () => {
    const { res } = await runProxy("no-domain-salon.marysoll.com", "/blog");
    expect(rewritePath(res)).toBe("/tenant/blogs/blog");
  });

  it("/checkin (QR) → rewrite /tenant/checkin", async () => {
    const { res } = await runProxy("no-domain-salon.marysoll.com", "/checkin");
    expect(rewritePath(res)).toBe("/tenant/checkin");
  });

  it("SA custom domenom: kanonski 301 na custom domen (SEO)", async () => {
    const { res } = await runProxy("kiki-kiss-beauty.marysoll.com", "/termini");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(
      "https://kikikiss.beauty/termini",
    );
  });

  it("favicon.ico → rewrite /tenant/favicon (tenant-svestan favicon)", async () => {
    const { res } = await runProxy("no-domain-salon.marysoll.com", "/favicon.ico");
    expect(rewritePath(res)).toBe("/tenant/favicon");
  });

  it("/api/public/* prolazi bez guarda", async () => {
    const { res } = await runProxy(
      "no-domain-salon.marysoll.com",
      "/api/public/no-domain-salon/services",
    );
    expect(isPass(res)).toBe(true);
  });
});

// ─── Custom domen ─────────────────────────────────────────────────────────────

describe("custom domen (kikikiss.beauty)", () => {
  it("/ → rewrite /tenant, tenant razrešen preko resolve-domain", async () => {
    const { res, calls } = await runProxy("kikikiss.beauty", "/");
    expect(rewritePath(res)).toBe("/tenant");
    expect(forwardedHeader(res, "x-tenant-slug")).toBe("kiki-kiss-beauty");
    expect(
      calls.some((c) => c.url.pathname === "/api/internal/resolve-domain"),
    ).toBe(true);
  });

  it("nema kanonskog redirecta kada je host VEĆ custom domen", async () => {
    const { res } = await runProxy("kikikiss.beauty", "/termini");
    expect(res.status).not.toBe(301);
    expect(rewritePath(res)).toBe("/tenant/termini");
  });
});

// ─── Admin / superadmin hostovi ───────────────────────────────────────────────

describe("platformski hostovi", () => {
  it("admin.marysoll.com stranica prolazi (guard samo za API)", async () => {
    const { res } = await runProxy("admin.marysoll.com", "/dashboard");
    expect(isPass(res)).toBe(true);
    expect(forwardedHeader(res, "x-domain-type")).toBe("admin");
  });
});

// ─── Debug trace (x-proxy-debug / ?proxy-debug=1) ─────────────────────────────

describe("debug trace", () => {
  it("?proxy-debug=1 → x-proxy-trace header sa koracima odluke", async () => {
    const { res } = await runProxy(
      "no-domain-salon.marysoll.com",
      "/termini?proxy-debug=1",
    );
    const traceHeader = res.headers.get("x-proxy-trace");
    expect(traceHeader).toContain("domain=client");
    expect(traceHeader).toContain("rewrite -> /tenant/termini");
  });

  it("bez debug flaga NEMA x-proxy-trace headera (produkcija ne plaća trace)", async () => {
    const { res } = await runProxy("no-domain-salon.marysoll.com", "/termini");
    expect(res.headers.get("x-proxy-trace")).toBeNull();
  });
});
