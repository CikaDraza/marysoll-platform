/**
 * environment-scenarios.test.ts — "da li se ponaša tačno ovako" po okruženju.
 *
 * Zaključava četiri konkretna toka koja korisnik proverava rukama:
 *
 *   1. staging.marysoll.com/login       → /dashboard (isti host)
 *   2. staging dashboard „Sajt salona"  → staging.marysoll.com/{slug}
 *   3. marysoll.com/login               → admin.marysoll.com (cross-host handoff)
 *   4. produkcijski dashboard           → custom domen, inače {slug}.marysoll.com
 *
 * Plus notifikacije (push + in-app) i mejlovi, jer i oni nose linkove — i
 * kome se push UOPŠTE šalje: pretplata iz tuđeg okruženja se preskače.
 *
 * Env se čita pri importu modula → vi.resetModules() + stub + svež import.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

const SLUG = "marina-stanisavljevic-skincare-edukacija";
const TENANT = {
  slug: SLUG,
  customDomain: "marina-skincare.rs",
  customDomainVerified: true,
};

vi.mock("server-only", () => ({}));
vi.mock("@/models/Tenant", () => ({
  Tenant: {
    findById: () => ({ select: () => ({ lean: async () => ({ slug: SLUG }) }) }),
  },
}));

/** Deljeno stanje za push mockove (vi.mock factory se hoistuje iznad modula). */
const pushState = vi.hoisted(() => ({
  /** Endpoint-i na koje je web-push STVARNO pozvan. */
  sent: [] as string[],
  subscriptions: [] as Array<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
    origin?: string | null;
  }>,
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: () => {},
    sendNotification: async (sub: { endpoint: string }) => {
      pushState.sent.push(sub.endpoint);
    },
  },
}));

vi.mock("@/lib/vapid", () => ({
  getVapidKeys: () => ({
    publicKey: "pub",
    privateKey: "priv",
    email: "push@marysoll.com",
  }),
  urlBase64ToUint8Array: () => new Uint8Array(),
}));

vi.mock("@/models/TenantUser", () => ({
  TenantUser: {
    findById: () => ({
      select: () => ({
        lean: async () => ({ pushSubscriptions: pushState.subscriptions }),
      }),
    }),
    findByIdAndUpdate: async () => {},
  },
}));

vi.mock("@/models/AuthUser", () => ({ AuthUser: {} }));

interface Env {
  /** Origin deploya (NEXT_PUBLIC_APP_URL). */
  appUrl?: string;
  /** "production" = pravi build (prod/staging/qa); inače dev. */
  nodeEnv?: string;
}

async function loadModules(env: Env = {}) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_BASE_DOMAIN", "marysoll.com");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", env.appUrl ?? "");
  vi.stubEnv("NODE_ENV", env.nodeEnv ?? "production");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("VERCEL_URL", "");

  return {
    host: await import("./host-context"),
    auth: await import("@/lib/auth/loginRedirect"),
    push: await import("@/lib/notifications/pushTargets"),
  };
}

/** Browser na datom hostu (hookovi čitaju window.location). */
function browserOn(hostname: string): void {
  vi.stubGlobal("window", {
    location: { hostname, origin: `https://${hostname}` },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ─── 1 + 2: STAGING ───────────────────────────────────────────────────────────

describe("staging.marysoll.com", () => {
  const STAGING: Env = { appUrl: "https://staging.marysoll.com" };

  it("1. prijava vlasnika sa /login ostaje na staging hostu → /dashboard", async () => {
    const { auth } = await loadModules(STAGING);
    expect(
      auth.loginRedirectUrl({
        isAdmin: true,
        isSuperAdmin: false,
        token: "jwt",
        hostname: "staging.marysoll.com",
      }),
    ).toBe("/dashboard");
  });

  it("1b. superadmin → /superadmin/dashboard na istom hostu", async () => {
    const { auth } = await loadModules(STAGING);
    expect(
      auth.loginRedirectUrl({
        isAdmin: true,
        isSuperAdmin: true,
        token: "jwt",
        hostname: "staging.marysoll.com",
      }),
    ).toBe("/superadmin/dashboard");
  });

  it("1c. education-first owner ide direktno u Edu Centar", async () => {
    const { auth } = await loadModules(STAGING);
    expect(
      auth.loginRedirectUrl({
        isAdmin: true,
        isSuperAdmin: false,
        token: "jwt",
        hostname: "staging.marysoll.com",
        adminDestination: "/education",
      }),
    ).toBe("/education");
  });

  it("2. Sajt salona u dashboardu vodi na staging.marysoll.com/{slug}, NE na custom domen", async () => {
    const { host } = await loadModules(STAGING);
    browserOn("staging.marysoll.com");
    expect(host.tenantOrigin(TENANT)).toBe(`https://staging.marysoll.com/${SLUG}`);
  });

  it("odjava klijenta salona vraća na /{slug}/login na staging hostu", async () => {
    const { auth } = await loadModules(STAGING);
    expect(
      auth.logoutRedirectUrl({
        hostname: "staging.marysoll.com",
        isTenantHost: false,
        tenantSlug: SLUG,
      }),
    ).toBe(`/${SLUG}/login`);
  });

  it("push klijentu vodi na /{slug}/panel, adminu na /dashboard", async () => {
    const { push } = await loadModules(STAGING);
    expect(await push.clientPanelPath("t-1", "?tab=Moji%20Termini")).toBe(
      `/${SLUG}/panel?tab=Moji%20Termini`,
    );
    expect(push.ADMIN_APPOINTMENTS_PATH).toBe("/dashboard?tab=termini");
  });

  it("mejl/verifikacija nose staging origin", async () => {
    const { host } = await loadModules(STAGING);
    expect(host.platformUrl("/verify-email?token=x")).toBe(
      "https://staging.marysoll.com/verify-email?token=x",
    );
    expect(host.tenantUrl(TENANT, "/panel")).toBe(
      `https://staging.marysoll.com/${SLUG}/panel`,
    );
  });
});

// ─── 3 + 4: PRODUKCIJA ────────────────────────────────────────────────────────

describe("marysoll.com (produkcija)", () => {
  const PROD: Env = { appUrl: "https://marysoll.com" };

  it("3. prijava vlasnika sa marysoll.com/login vodi na admin.marysoll.com", async () => {
    const { auth } = await loadModules(PROD);
    const target = auth.loginRedirectUrl({
      isAdmin: true,
      isSuperAdmin: false,
      token: "jwt token",
      hostname: "marysoll.com",
    });
    expect(target).toBe(
      "https://admin.marysoll.com/auth/callback?token=jwt%20token&redirect=/dashboard",
    );
  });

  it("3b. superadmin ide na superadmin.marysoll.com", async () => {
    const { auth } = await loadModules(PROD);
    expect(
      auth.loginRedirectUrl({
        isAdmin: true,
        isSuperAdmin: true,
        token: "jwt",
        hostname: "marysoll.com",
      }),
    ).toBe("https://superadmin.marysoll.com/superadmin/dashboard");
  });

  it("3b.1 education-first handoff čuva Education destinaciju", async () => {
    const { auth } = await loadModules(PROD);
    expect(
      auth.loginRedirectUrl({
        isAdmin: true,
        isSuperAdmin: false,
        token: "jwt",
        hostname: "marysoll.com",
        adminDestination: "/education",
      }),
    ).toBe(
      "https://admin.marysoll.com/auth/callback?token=jwt&redirect=/education",
    );
  });

  it("3c. isto važi kad je vlasnik već na admin.marysoll.com", async () => {
    const { auth } = await loadModules(PROD);
    expect(
      auth.loginRedirectUrl({
        isAdmin: true,
        isSuperAdmin: false,
        token: "jwt",
        hostname: "admin.marysoll.com",
      }),
    ).toContain("https://admin.marysoll.com/auth/callback");
  });

  it("4. Sajt salona u dashboardu vodi na VERIFIKOVAN custom domen", async () => {
    const { host } = await loadModules(PROD);
    browserOn("admin.marysoll.com");
    expect(host.tenantOrigin(TENANT)).toBe("https://marina-skincare.rs");
  });

  it("4b. bez custom domena ili neverifikovan → {slug}.marysoll.com", async () => {
    const { host } = await loadModules(PROD);
    browserOn("admin.marysoll.com");
    expect(host.tenantOrigin({ slug: SLUG })).toBe(`https://${SLUG}.marysoll.com`);
    expect(
      host.tenantOrigin({ ...TENANT, customDomainVerified: false }),
    ).toBe(`https://${SLUG}.marysoll.com`);
  });

  it("push klijentu ostaje /panel (salon je na svom hostu) — bez DB pogotka", async () => {
    const { push } = await loadModules(PROD);
    expect(await push.clientPanelPath("t-1", "?tab=Moji%20Termini")).toBe(
      "/panel?tab=Moji%20Termini",
    );
  });

  it("mejlovi nose produkcijske linkove", async () => {
    const { host } = await loadModules(PROD);
    expect(host.platformUrl("/dashboard")).toBe("https://marysoll.com/dashboard");
    expect(host.tenantUrl(TENANT, "/panel")).toBe(
      "https://marina-skincare.rs/panel",
    );
  });

  it("dashboard na admin.marysoll.com NE sme da ponudi admin host kao sajt salona", async () => {
    const { host } = await loadModules(PROD);
    browserOn("admin.marysoll.com");
    // Regresija: `platformOrigin()` bi ovde dao admin.marysoll.com/{slug} —
    // adresu koja ne servira javni sajt salona.
    expect(host.tenantOrigin({ slug: SLUG })).toBe(
      `https://${SLUG}.marysoll.com`,
    );
  });

  it("linkovi ka Marysoll marketingu se grade iz env-a, ne iz hosta zahteva", async () => {
    const { host } = await loadModules(PROD);
    // Kontakt/CTA/SEO crawl kreće sa superadmin panela ili sa domena salona —
    // ako bi uzeli host zahteva, link bi vodio tamo umesto na javni sajt.
    const fromSuperadmin = {
      headers: {
        get: (n: string) =>
          n.toLowerCase() === "host" ? "superadmin.marysoll.com" : null,
      },
    };
    expect(host.platformUrl("/kontakt")).toBe("https://marysoll.com/kontakt");
    // Kad host zahteva JESTE relevantan (verifikacioni link iz mejla), prosleđuje se.
    expect(host.platformUrl("/kontakt", fromSuperadmin)).toBe(
      "https://superadmin.marysoll.com/kontakt",
    );
  });

  it("odjava klijenta sa tenant hosta ostaje na tom hostu", async () => {
    const { auth } = await loadModules(PROD);
    expect(
      auth.logoutRedirectUrl({
        hostname: "marina-skincare.rs",
        isTenantHost: true,
        tenantSlug: SLUG,
      }),
    ).toBe("/login");
  });
});

// ─── DEV ──────────────────────────────────────────────────────────────────────

describe("localhost (dev)", () => {
  const DEV: Env = { nodeEnv: "development", appUrl: "https://marysoll.com" };

  it("prijava ostaje lokalna → /dashboard", async () => {
    const { auth } = await loadModules(DEV);
    expect(
      auth.loginRedirectUrl({
        isAdmin: true,
        isSuperAdmin: false,
        token: "jwt",
        hostname: "localhost",
      }),
    ).toBe("/dashboard");
  });

  it("salon je path-based na lokalnom serveru", async () => {
    const { host } = await loadModules(DEV);
    expect(host.tenantOrigin(TENANT)).toBe(`http://localhost:3006/${SLUG}`);
  });

  it("push klijentu nosi /{slug}/panel", async () => {
    const { push } = await loadModules(DEV);
    expect(await push.clientPanelPath("t-1")).toBe(`/${SLUG}/panel`);
  });
});

// ─── 5: KOME SE PUSH ŠALJE ────────────────────────────────────────────────────
//
// Push `url` je root-relativan, a service worker ga razrešava na originu na
// kome je REGISTROVAN. Preview deployi dele bazu sa produkcijom, pa je pretplata
// sa `…vercel.app` u istom dokumentu: produkcijski podsetnik je tamo otvarao
// `…vercel.app/dashboard?tab=termini`, gde nema sesije → goli `/login`.

const PREVIEW_HOST =
  "marysoll-platform-git-optimizacija-f-8d0886-cikadrazas-projects.vercel.app";

/** Pretplate istog korisnika, napravljene na raznim originima. */
const SUBSCRIPTIONS = [
  ["prod-admin", "https://admin.marysoll.com"],
  ["prod-tenant", `https://${SLUG}.marysoll.com`],
  ["prod-custom", "https://marina-skincare.rs"],
  ["staging", "https://staging.marysoll.com"],
  ["preview", `https://${PREVIEW_HOST}`],
  ["dev", "http://localhost:3006"],
  ["legacy", null], // zapis stariji od `origin` polja
].map(([endpoint, origin]) => ({
  endpoint: endpoint as string,
  keys: { p256dh: "p", auth: "a" },
  origin,
}));

/** Pošalje podsetnik iz zadatog okruženja → endpoint-i koji su ga dobili. */
async function pushFrom(env: Env & { vercelUrl?: string }): Promise<string[]> {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_BASE_DOMAIN", "marysoll.com");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", env.appUrl ?? "");
  vi.stubEnv("NODE_ENV", env.nodeEnv ?? "production");
  vi.stubEnv("VERCEL_ENV", env.vercelUrl ? "preview" : "");
  vi.stubEnv("VERCEL_URL", env.vercelUrl ?? "");

  pushState.sent = [];
  pushState.subscriptions = SUBSCRIPTIONS;

  const { sendWebPushToUser } = await import("@/lib/webPush");
  await sendWebPushToUser("tenant-user-1", {
    title: "Salon",
    body: "⏰ Podsetnik: Korekcija Mix Tehnika",
    url: "/dashboard?tab=termini",
  });
  return [...pushState.sent].sort();
}

describe("push se šalje samo pretplatama iz istog okruženja", () => {
  it("produkcija gađa sve svoje hostove (apex, subdomen, custom domen)", async () => {
    expect(await pushFrom({ appUrl: "https://marysoll.com" })).toEqual([
      "legacy",
      "prod-admin",
      "prod-custom",
      "prod-tenant",
    ]);
  });

  it("preview deploy gađa samo svoju pretplatu", async () => {
    expect(await pushFrom({ vercelUrl: PREVIEW_HOST })).toEqual([
      "legacy",
      "preview",
    ]);
  });

  it("staging ne gađa produkciju ni obrnuto", async () => {
    expect(await pushFrom({ appUrl: "https://staging.marysoll.com" })).toEqual([
      "legacy",
      "staging",
    ]);
  });

  it("lokalni dev ne šalje push pravim korisnicima", async () => {
    expect(
      await pushFrom({ nodeEnv: "development", appUrl: "https://marysoll.com" }),
    ).toEqual(["dev", "legacy"]);
  });
});
