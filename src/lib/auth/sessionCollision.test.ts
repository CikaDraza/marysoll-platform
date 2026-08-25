/**
 * Incident sa staging-a: admin panel ostaje otvoren i šalje TUĐ identitet, a
 * server zato vraća 404 „Termin nije pronađen" — bez ikakve poruke korisniku.
 *
 *   tab A: admin tenanta A, panel otvoren
 *   tab B: prijava/odjava u drugom kontekstu (klijentski panel istog origin-a)
 *        → localStorage["token"] se promeni za CEO origin
 *   tab A: klik „klijentkinja je došla"
 *        → readRawToken() je uzimao localStorage sa NAJVIŠIM prioritetom
 *        → PUT nosi identitet iz pogrešne sesije
 *        → server ispravno scope-uje upit i ne nalazi termin u tom scope-u
 *        → 404
 *
 * Zaključano pravilo: `localStorage["token"]` NIKADA nema prioritet nad
 * autoritativnom aktivnom sesijom (cookie koji je server postavio pri prijavi).
 * Server ostaje nepromenjen — 404 je ispravno ponašanje za upit van scope-a.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

function jwt(payload: Record<string, unknown>): string {
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ exp, ...payload })}.potpis`;
}

const ADMIN = jwt({
  id: "admin-1", email: "marija@salon.test", name: "Marija Ivic",
  isAdmin: true, tenantId: "tenant-a", tenantUserId: "u-admin",
});
const KLIJENT = jwt({
  id: "client-1", email: "milica@example.test", name: "Milica Petronijevic",
  isAdmin: false, tenantId: "tenant-a", tenantUserId: "u-klijent",
});

/** Jedan origin = jedan localStorage + jedan document.cookie. */
function mountOrigin() {
  const store = new Map<string, string>();
  const doc = { cookie: "" };
  Object.assign(globalThis, {
    window: globalThis,
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    document: doc,
  });
  return {
    store,
    setTenantCookie: (t: string | null) => {
      doc.cookie = t ? `tenant-access-token=${t}` : "";
    },
  };
}

let origin: ReturnType<typeof mountOrigin>;
let authClient: typeof import("./auth-client");

beforeEach(async () => {
  origin = mountOrigin();
  authClient = await import("./auth-client");
});

afterEach(() => {
  for (const k of ["window", "localStorage", "document"]) {
    delete (globalThis as Record<string, unknown>)[k];
  }
});

describe("izvor istine za sesiju", () => {
  it("aktivna sesija (cookie) pobeđuje ustajao localStorage", () => {
    origin.store.set("token", ADMIN);      // keš zaostao iz ranije sesije
    origin.setTenantCookie(KLIJENT);       // server je postavio ovu sesiju

    expect(authClient.getRawToken()).toBe(KLIJENT);
    expect(authClient.getUserFromToken()?.isAdmin).toBe(false);
    expect(authClient.getUserFromToken()?.name).toBe("Milica Petronijevic");
  });

  it("čitanje sesije osvežava keš, da Bearer pozivi ne nose stari identitet", () => {
    origin.store.set("token", ADMIN);
    origin.setTenantCookie(KLIJENT);

    authClient.getRawToken();
    expect(origin.store.get("token")).toBe(KLIJENT);
  });

  it("localStorage se koristi SAMO kada aktivne sesije nema", () => {
    origin.store.set("token", ADMIN);
    origin.setTenantCookie(null);

    expect(authClient.getRawToken()).toBe(ADMIN);
  });

  it("bez sesije i bez keša nema korisnika", () => {
    origin.setTenantCookie(null);
    expect(authClient.getRawToken()).toBeNull();
    expect(authClient.getUserFromToken()).toBeNull();
  });
});

describe("scenario incidenta", () => {
  it("posle prijave klijenta u drugom tabu, admin tab čita KLIJENTSKI identitet", () => {
    // tab A: admin radi u panelu
    origin.setTenantCookie(ADMIN);
    origin.store.set("token", ADMIN);
    expect(authClient.getUserFromToken()?.isAdmin).toBe(true);

    // tab B: odjava pa prijava kao pravi klijent — isti origin, isti slot
    origin.setTenantCookie(KLIJENT);
    origin.store.set("token", KLIJENT);

    // tab A pri sledećoj proveri više NE vidi sebe kao admina. Time guard na
    // /dashboard (`!user.isAdmin` → redirect na /login) može da odreaguje;
    // ranije je `useAuth` keširao korisnika zauvek pa se to nikad nije desilo.
    const sada = authClient.getUserFromToken();
    expect(sada?.isAdmin).toBe(false);
    expect(sada?.tenantUserId).toBe("u-klijent");
  });

  it("odjava u drugom tabu ostavlja tab A bez sesije", () => {
    origin.setTenantCookie(ADMIN);
    origin.store.set("token", ADMIN);

    origin.setTenantCookie(null);
    origin.store.delete("token");

    expect(authClient.getUserFromToken()).toBeNull();
  });

  it("kontrola: na produkciji su admin i klijent na različitim originima", () => {
    const adminOrigin = mountOrigin();
    adminOrigin.setTenantCookie(ADMIN);
    expect(authClient.getUserFromToken()?.isAdmin).toBe(true);

    const klijentOrigin = mountOrigin();
    klijentOrigin.setTenantCookie(KLIJENT);
    expect(authClient.getUserFromToken()?.isAdmin).toBe(false);

    // Admin origin je netaknut — zato produkcija nije pogođena.
    expect(adminOrigin.store.get("token")).toBe(ADMIN);
  });
});
