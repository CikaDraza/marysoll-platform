/**
 * Regresiona mreža za resend verifikacije.
 *
 * Ključni slučaj: marysoll.com/resend-verification. Proxy tamo šalje PRAZAN
 * `x-tenant-slug` (apex je "marketing" tip), pa je ruta ranije izlazila sa 200
 * i porukom o uspehu — a nijedan mejl nije slala. Korisnica bi videla
 * "Email je poslat!" i čekala mejl koji nikad ne stiže.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("@/lib/email/onboarding", () => ({
  sendOwnerVerificationEmail: vi.fn(async () => {}),
  sendClientVerificationEmail: vi.fn(async () => {}),
}));
vi.mock("@/models/TenantUser", () => ({ TenantUser: { findOne: vi.fn() } }));
vi.mock("@/models/Tenant", () => ({
  Tenant: { findOne: vi.fn(), findById: vi.fn() },
}));

import { TenantUser } from "@/models/TenantUser";
import { Tenant } from "@/models/Tenant";
import {
  sendOwnerVerificationEmail,
  sendClientVerificationEmail,
} from "@/lib/email/onboarding";
import { POST } from "./route";

const GENERIC = "Ako nalog postoji i nije verifikovan, novi link je poslat.";

type Doc = Record<string, unknown> & { save: () => Promise<void> };

/** findOne() se u jednoj grani awaituje direktno, u drugoj kroz .sort() */
function query(doc: unknown) {
  const p = Promise.resolve(doc);
  return {
    sort: () => p,
    then: (r: (v: unknown) => void, j: (e: unknown) => void) => p.then(r, j),
  };
}

function leanQuery(doc: unknown) {
  return { select: () => ({ lean: async () => doc }) };
}

function ownerDoc(overrides: Record<string, unknown> = {}): Doc {
  return {
    email: "marina.beauty.beaztu@outlook.com",
    name: "Marina B. Stanisavljević",
    role: "OWNER",
    tenantId: "t-marina",
    isEmailVerified: false,
    verificationToken: null,
    verificationTokenExpiry: null,
    save: vi.fn(async () => {}),
    ...overrides,
  };
}

function clientDoc(overrides: Record<string, unknown> = {}): Doc {
  return {
    ...ownerDoc(),
    email: "ana@example.com",
    name: "Ana Anić",
    role: "USER",
    ...overrides,
  };
}

const TENANT = { _id: "t-marina", name: "Marina Beauty", slug: "marina-beauty" };

function request(
  body: object,
  tenantSlugHeader: string | null,
  host = "marysoll.com",
) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (tenantSlugHeader !== null) headers["x-tenant-slug"] = tenantSlugHeader;
  return new NextRequest(`https://${host}/api/auth/resend-verification`, {
    method: "POST",
    headers: { ...headers, host },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(Tenant.findById).mockReturnValue(
    leanQuery(TENANT) as unknown as ReturnType<typeof Tenant.findById>,
  );
});

describe("POST /api/auth/resend-verification", () => {
  it("apex (prazan x-tenant-slug): nađe vlasnika po emailu i pošalje mu link", async () => {
    const owner = ownerDoc();
    vi.mocked(TenantUser.findOne).mockReturnValue(
      query(owner) as unknown as ReturnType<typeof TenantUser.findOne>,
    );

    const res = await POST(request({ email: "Marina.Beauty.Beaztu@Outlook.com" }, ""));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe(GENERIC);

    // pretraga je globalna, po normalizovanom emailu, samo neverifikovani
    expect(TenantUser.findOne).toHaveBeenCalledWith({
      email: "marina.beauty.beaztu@outlook.com",
      role: { $in: ["OWNER", "ADMIN", "STAFF"] },
      isEmailVerified: false,
    });

    // token je upisan i ima rok
    expect(owner.verificationToken).toMatch(/^[0-9a-f]{64}$/);
    expect(owner.verificationTokenExpiry).toBeInstanceOf(Date);
    expect(owner.save).toHaveBeenCalled();

    // mejl je stvarno poslat, sa istim tokenom
    expect(sendOwnerVerificationEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendOwnerVerificationEmail).mock.calls[0][0]).toMatchObject({
      email: "marina.beauty.beaztu@outlook.com",
      salonName: "Marina Beauty",
      verificationToken: owner.verificationToken,
    });
    expect(sendClientVerificationEmail).not.toHaveBeenCalled();
  });

  it("apex: već verifikovan nalog → ista poruka, bez mejla", async () => {
    vi.mocked(TenantUser.findOne).mockReturnValue(
      query(null) as unknown as ReturnType<typeof TenantUser.findOne>,
    );

    const res = await POST(request({ email: "verifikovana@example.com" }, ""));

    expect((await res.json()).message).toBe(GENERIC);
    expect(sendOwnerVerificationEmail).not.toHaveBeenCalled();
    expect(sendClientVerificationEmail).not.toHaveBeenCalled();
  });

  it("tenant domen: pretraga ostaje ograničena na taj salon", async () => {
    vi.mocked(Tenant.findOne).mockReturnValue(
      leanQuery(TENANT) as unknown as ReturnType<typeof Tenant.findOne>,
    );
    vi.mocked(TenantUser.findOne).mockReturnValue(
      query(ownerDoc()) as unknown as ReturnType<typeof TenantUser.findOne>,
    );

    await POST(request({ email: "marina.beauty.beaztu@outlook.com" }, "marina-beauty"));

    expect(Tenant.findOne).toHaveBeenCalledWith({ slug: "marina-beauty" });
    expect(TenantUser.findOne).toHaveBeenCalledWith({
      tenantId: "t-marina",
      email: "marina.beauty.beaztu@outlook.com",
    });
    expect(sendOwnerVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it("tenant domen: klijent salona ({slug}.marysoll.com / custom domen)", async () => {
    vi.mocked(Tenant.findOne).mockReturnValue(
      leanQuery(TENANT) as unknown as ReturnType<typeof Tenant.findOne>,
    );
    const client = clientDoc();
    vi.mocked(TenantUser.findOne).mockReturnValue(query(client) as never);

    // proxy ubaci isti x-tenant-slug i za subdomen i za custom domen
    await POST(request({ email: "ana@example.com" }, "marina-beauty"));

    expect(TenantUser.findOne).toHaveBeenCalledWith({
      tenantId: "t-marina",
      email: "ana@example.com",
    });
    expect(sendClientVerificationEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendClientVerificationEmail).mock.calls[0][0]).toMatchObject({
      email: "ana@example.com",
      salonName: "Marina Beauty",
      salonBaseUrl: "https://marina-beauty.marysoll.com",
      verificationToken: client.verificationToken,
    });
    expect(sendOwnerVerificationEmail).not.toHaveBeenCalled();
  });

  it("staging host → mejl nosi staging (path-based) URL salona", async () => {
    vi.mocked(Tenant.findOne).mockReturnValue(
      leanQuery(TENANT) as unknown as ReturnType<typeof Tenant.findOne>,
    );
    vi.mocked(TenantUser.findOne).mockReturnValue(query(clientDoc()) as never);

    await POST(
      request({ email: "ana@example.com" }, "marina-beauty", "staging.marysoll.com"),
    );

    expect(vi.mocked(sendClientVerificationEmail).mock.calls[0][0]).toMatchObject({
      salonBaseUrl: "https://staging.marysoll.com/marina-beauty",
    });
  });

  it("nepoznat salon u headeru → ista poruka, bez mejla", async () => {
    vi.mocked(Tenant.findOne).mockReturnValue(
      leanQuery(null) as unknown as ReturnType<typeof Tenant.findOne>,
    );

    const res = await POST(request({ email: "bilo@example.com" }, "ne-postoji"));

    expect((await res.json()).message).toBe(GENERIC);
    expect(TenantUser.findOne).not.toHaveBeenCalled();
    expect(sendOwnerVerificationEmail).not.toHaveBeenCalled();
  });

  it("apex: klijent salona (USER) sa isteklim linkom dobija novi", async () => {
    const client = clientDoc();
    vi.mocked(TenantUser.findOne)
      .mockReturnValueOnce(query(null) as never) // nema management naloga
      .mockReturnValueOnce(query(client) as never); // ima klijenta

    const res = await POST(request({ email: "ana@example.com" }, ""));

    expect((await res.json()).message).toBe(GENERIC);
    expect(vi.mocked(TenantUser.findOne).mock.calls[1][0]).toEqual({
      email: "ana@example.com",
      role: { $nin: ["OWNER", "ADMIN", "STAFF"] },
      isEmailVerified: false,
    });
    expect(sendClientVerificationEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendClientVerificationEmail).mock.calls[0][0]).toMatchObject({
      email: "ana@example.com",
      salonName: "Marina Beauty",
      verificationToken: client.verificationToken,
    });
    expect(sendOwnerVerificationEmail).not.toHaveBeenCalled();
  });

  it("apex: management ima prednost nad klijentom (klijent se i ne traži)", async () => {
    vi.mocked(TenantUser.findOne).mockReturnValue(query(ownerDoc()) as never);

    await POST(request({ email: "marina.beauty.beaztu@outlook.com" }, ""));

    expect(TenantUser.findOne).toHaveBeenCalledTimes(1);
    expect(sendOwnerVerificationEmail).toHaveBeenCalledTimes(1);
    expect(sendClientVerificationEmail).not.toHaveBeenCalled();
  });

  it("ponovni pokušaj: svaki resend upisuje NOVI token i novi rok", async () => {
    const owner = ownerDoc({
      verificationToken: "stari-token",
      verificationTokenExpiry: new Date(Date.now() - 1000),
    });
    vi.mocked(TenantUser.findOne).mockReturnValue(query(owner) as never);

    await POST(request({ email: "marina.beauty.beaztu@outlook.com" }, ""));
    const prvi = owner.verificationToken;
    expect(prvi).not.toBe("stari-token");
    expect((owner.verificationTokenExpiry as Date).getTime()).toBeGreaterThan(Date.now());

    await POST(request({ email: "marina.beauty.beaztu@outlook.com" }, ""));
    expect(owner.verificationToken).not.toBe(prvi); // stari link prestaje da važi
    expect(sendOwnerVerificationEmail).toHaveBeenCalledTimes(2);
  });

  it("bez emaila → 400", async () => {
    const res = await POST(request({}, ""));
    expect(res.status).toBe(400);
  });
});
