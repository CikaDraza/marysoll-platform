/**
 * host-context.test.ts — zaključava kako se hostovi klasifikuju.
 *
 * Regresija koju čuva: staging.marysoll.com / qa.marysoll.com se serviraju
 * PATH-BASED (login i dashboard na istom hostu, salon na `/{slug}`), iako se
 * završavaju na `.marysoll.com`. Svaka kopija tog uslova koja ih je izostavila
 * slala je korisnika sa staginga na produkciju (ili na nepostojeći subdomen).
 *
 * Env se čita pri IMPORTU modula → vi.resetModules() + stub + svež import.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

type HostContext = typeof import("./host-context");

interface LoadEnv {
  baseDomain?: string;
  stagingHosts?: string;
  /** Deploy env: "production" = pravi build (prod/staging/qa), inače dev. */
  nodeEnv?: string;
  appUrl?: string;
  nextAuthUrl?: string;
  vercelEnv?: string;
  vercelUrl?: string;
}

async function load(env: LoadEnv = {}): Promise<HostContext> {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_BASE_DOMAIN", env.baseDomain ?? "marysoll.com");
  vi.stubEnv("NODE_ENV", env.nodeEnv ?? "production");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", env.appUrl ?? "");
  vi.stubEnv("NEXTAUTH_URL", env.nextAuthUrl ?? "");
  vi.stubEnv("VERCEL_ENV", env.vercelEnv ?? "");
  vi.stubEnv("VERCEL_URL", env.vercelUrl ?? "");
  if (env.stagingHosts !== undefined) {
    vi.stubEnv("NEXT_PUBLIC_STAGING_PATH_HOSTS", env.stagingHosts);
  }
  return import("./host-context");
}

/** Zahtev sa host headerom — kako ga proxy/route handler vidi na Vercelu. */
function req(host: string, proto = "https") {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "host"
          ? host
          : name.toLowerCase() === "x-forwarded-proto"
            ? proto
            : null,
    },
  };
}

/** Minimalni window stub — modul čita samo location.hostname/origin. */
function stubWindow(hostname: string): void {
  vi.stubGlobal("window", {
    location: { hostname, origin: `https://${hostname}` },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("isPathBasedHost", () => {
  it("staging/qa apex su path-based (iako su *.marysoll.com)", async () => {
    const { isPathBasedHost } = await load();
    expect(isPathBasedHost("staging.marysoll.com")).toBe(true);
    expect(isPathBasedHost("qa.marysoll.com")).toBe(true);
  });

  it("dev i preview su path-based", async () => {
    const { isPathBasedHost } = await load();
    expect(isPathBasedHost("localhost:3006")).toBe(true);
    expect(isPathBasedHost("127.0.0.1")).toBe(true);
    expect(isPathBasedHost("192.168.1.20:3000")).toBe(true);
    expect(isPathBasedHost("marysoll-git-branch.vercel.app")).toBe(true);
  });

  it("produkcijski hostovi NISU path-based", async () => {
    const { isPathBasedHost } = await load();
    expect(isPathBasedHost("marysoll.com")).toBe(false);
    expect(isPathBasedHost("admin.marysoll.com")).toBe(false);
    expect(isPathBasedHost("the-lash-room-by-anja.marysoll.com")).toBe(false);
    expect(isPathBasedHost("kikikiss.beauty")).toBe(false);
  });

  it("radi i kad staging deploy ima BASE_DOMAIN=staging.marysoll.com", async () => {
    const { isPathBasedHost } = await load({ baseDomain: "staging.marysoll.com" });
    expect(isPathBasedHost("staging.marysoll.com")).toBe(true);
  });

  it("lista se menja env-om", async () => {
    const { isPathBasedHost } = await load({ stagingHosts: "test.marysoll.com" });
    expect(isPathBasedHost("test.marysoll.com")).toBe(true);
    expect(isPathBasedHost("qa.marysoll.com")).toBe(false);
  });
});

describe("tenantSlugFromPath", () => {
  it("izvlači slug salona", async () => {
    const { tenantSlugFromPath } = await load();
    expect(tenantSlugFromPath("/the-lash-room-by-anja")).toBe(
      "the-lash-room-by-anja",
    );
    expect(tenantSlugFromPath("/the-lash-room-by-anja/panel")).toBe(
      "the-lash-room-by-anja",
    );
  });

  it("platformske putanje nisu slug", async () => {
    const { tenantSlugFromPath } = await load();
    expect(tenantSlugFromPath("/")).toBeNull();
    expect(tenantSlugFromPath("/login")).toBeNull();
    expect(tenantSlugFromPath("/dashboard?tab=pretplata")).toBeNull();
    expect(tenantSlugFromPath("/superadmin/dashboard")).toBeNull();
  });
});

describe("adminOrigin", () => {
  it("prazan (isti origin) na staging/qa i dev-u", async () => {
    const { adminOrigin } = await load();
    stubWindow("staging.marysoll.com");
    expect(adminOrigin()).toBe("");
    stubWindow("localhost");
    expect(adminOrigin()).toBe("");
  });

  it("admin subdomen na produkciji", async () => {
    const { adminOrigin } = await load();
    stubWindow("marysoll.com");
    expect(adminOrigin()).toBe("https://admin.marysoll.com");
  });
});

describe("tenantOrigin", () => {
  const tenant = {
    slug: "the-lash-room-by-anja",
    customDomain: "lashroom.rs",
    customDomainVerified: true,
  };

  it("staging: ostaje na staging hostu, path-based (NE na custom domen)", async () => {
    const { tenantOrigin } = await load();
    stubWindow("staging.marysoll.com");
    expect(tenantOrigin(tenant)).toBe(
      "https://staging.marysoll.com/the-lash-room-by-anja",
    );
  });

  it("produkcija: verifikovan custom domen", async () => {
    const { tenantOrigin } = await load();
    stubWindow("admin.marysoll.com");
    expect(tenantOrigin(tenant)).toBe("https://lashroom.rs");
  });

  it("produkcija bez custom domena: tenant subdomen", async () => {
    const { tenantOrigin } = await load();
    stubWindow("admin.marysoll.com");
    expect(
      tenantOrigin({ slug: "no-domain-salon", customDomainVerified: false }),
    ).toBe("https://no-domain-salon.marysoll.com");
  });

  it("neverifikovan custom domen se ignoriše", async () => {
    const { tenantOrigin } = await load();
    stubWindow("admin.marysoll.com");
    expect(
      tenantOrigin({ ...tenant, customDomainVerified: false }),
    ).toBe("https://the-lash-room-by-anja.marysoll.com");
  });
});


// ── Origin po okruženju ───────────────────────────────────────────────────────

describe("platformOrigin", () => {
  it("DEV je uvek lokalan — čak i kad .env.local nosi produkcijski APP_URL", async () => {
    const { platformOrigin } = await load({
      nodeEnv: "development",
      appUrl: "https://marysoll.com",
    });
    expect(platformOrigin()).toBe("http://localhost:3006");
  });

  it("DEV poštuje lokalni/LAN APP_URL (testiranje sa telefona)", async () => {
    const { platformOrigin } = await load({
      nodeEnv: "development",
      appUrl: "http://192.168.1.20:3006",
    });
    expect(platformOrigin()).toBe("http://192.168.1.20:3006");
  });

  it("staging deploy gradi iz svog NEXT_PUBLIC_APP_URL", async () => {
    const { platformOrigin } = await load({
      appUrl: "https://staging.marysoll.com/",
    });
    expect(platformOrigin()).toBe("https://staging.marysoll.com");
  });

  it("Vercel preview BEZ svog domena gradi iz VERCEL_URL", async () => {
    const { platformOrigin } = await load({
      vercelEnv: "preview",
      vercelUrl: "marysoll-git-fix.vercel.app",
    });
    expect(platformOrigin()).toBe("https://marysoll-git-fix.vercel.app");
  });

  it("staging/qa su preview deployi SA domenom — APP_URL je jači od VERCEL_URL", async () => {
    const { platformOrigin } = await load({
      appUrl: "https://staging.marysoll.com",
      vercelEnv: "preview",
      vercelUrl: "marysoll-git-staging.vercel.app",
    });
    expect(platformOrigin()).toBe("https://staging.marysoll.com");
  });

  it("legacy NEXTAUTH_URL i dalje važi kad APP_URL nije postavljen", async () => {
    const { platformOrigin } = await load({
      nextAuthUrl: "https://qa.marysoll.com",
    });
    expect(platformOrigin()).toBe("https://qa.marysoll.com");
  });

  it("bez ičega pada na BASE_DOMAIN", async () => {
    const { platformOrigin } = await load();
    expect(platformOrigin()).toBe("https://marysoll.com");
  });

  it("zahtev je jači od env-a (isti kod servira više hostova)", async () => {
    const { platformOrigin } = await load({ appUrl: "https://marysoll.com" });
    expect(platformOrigin(req("qa.marysoll.com"))).toBe(
      "https://qa.marysoll.com",
    );
  });

  it("browser uvek gleda svoj origin", async () => {
    const { platformOrigin } = await load({ appUrl: "https://marysoll.com" });
    stubWindow("staging.marysoll.com");
    expect(platformOrigin()).toBe("https://staging.marysoll.com");
  });
});

describe("tenantOrigin / tenantUrl po okruženju", () => {
  const tenant = {
    slug: "the-lash-room-by-anja",
    customDomain: "lashroom.rs",
    customDomainVerified: true,
  };

  it("dev → path-based na lokalnom serveru", async () => {
    const { tenantUrl } = await load({ nodeEnv: "development" });
    expect(tenantUrl(tenant, "/panel")).toBe(
      "http://localhost:3006/the-lash-room-by-anja/panel",
    );
  });

  it("staging zahtev → path-based na staging hostu (NE prod custom domen)", async () => {
    const { tenantUrl } = await load({ appUrl: "https://marysoll.com" });
    expect(tenantUrl(tenant, "/panel", req("staging.marysoll.com"))).toBe(
      "https://staging.marysoll.com/the-lash-room-by-anja/panel",
    );
  });

  it("produkcijski zahtev → verifikovan custom domen", async () => {
    const { tenantUrl } = await load({ appUrl: "https://marysoll.com" });
    expect(tenantUrl(tenant, "/panel", req("marysoll.com"))).toBe(
      "https://lashroom.rs/panel",
    );
  });

  it("produkcija bez custom domena → tenant subdomen", async () => {
    const { tenantUrl } = await load({ appUrl: "https://marysoll.com" });
    expect(tenantUrl({ slug: "no-domain-salon" }, "/checkin")).toBe(
      "https://no-domain-salon.marysoll.com/checkin",
    );
  });
});

describe("platformUrl", () => {
  it("spaja putanju na origin okruženja", async () => {
    const { platformUrl } = await load({ appUrl: "https://qa.marysoll.com" });
    expect(platformUrl("/dashboard?tab=pretplata")).toBe(
      "https://qa.marysoll.com/dashboard?tab=pretplata",
    );
  });
});
