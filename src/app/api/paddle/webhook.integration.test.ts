/**
 * Paddle webhook — trajnost prijema.
 *
 * Zatvara konkretan incident koji je bio moguć: Paddle ponavlja isporuku na
 * svaki non-2xx, a obrada nije imala dedup. Ponovljen `subscription.canceled`
 * je time ponovo obarao tenanta na besplatan plan — salon koji plaća gubio bi
 * plaćene funkcije zbog provajderovog retry-ja.
 *
 * Testovi idu nad pravim Mongo-om jer je cela ograda unique indeks; mock bi
 * dokazao samo da je kod pozvan.
 */
import crypto from "crypto";
import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Tenant } from "@/models/Tenant";
import { Plan } from "@/models/Plan";
import { Subscription } from "@/models/Subscription";
import { WebhookEvent } from "@/models/WebhookEvent";
import { POST } from "./webhook/route";
import { verifyPaddleSignature } from "@/lib/paddle";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: async () => undefined }));
vi.mock("@/lib/plans/subscriptionNotifications", () => ({
  notifySubscriptionCancelled: vi.fn(async () => null),
}));

const SECRET = "pdl_ntfset_test_secret";
process.env.PADDLE_WEBHOOK_SECRET = SECRET;
process.env.NEXT_PUBLIC_PADDLE_ENV = "live";

let replSet: MongoMemoryReplSet;
let tenantId: Types.ObjectId;

interface TenantRow { paid: boolean; plan: string; status: string }
interface EventRow {
  status: string;
  attempts: number;
  skipReason: string | null;
  lastError: string | null;
  tenantId: Types.ObjectId | null;
}

const readTenant = () => Tenant.findById(tenantId).lean<TenantRow>();
const readEvent = (providerEventId: string) =>
  WebhookEvent.findOne({ providerEventId }).lean<EventRow>();

/** Potpiše telo tačno onako kako Paddle potpisuje. */
function sign(body: string, tsSeconds = Math.floor(Date.now() / 1000)): string {
  const h1 = crypto
    .createHmac("sha256", SECRET)
    .update(`${tsSeconds}:${body}`)
    .digest("hex");
  return `ts=${tsSeconds};h1=${h1}`;
}

function request(body: string, signature: string) {
  return new Request("https://marysoll.com/api/paddle/webhook", {
    method: "POST",
    headers: { "paddle-signature": signature, "content-type": "application/json" },
    body,
  }) as never;
}

function cancelEvent(eventId: string, occurredAt = new Date().toISOString()) {
  return {
    event_id: eventId,
    event_type: "subscription.canceled",
    occurred_at: occurredAt,
    data: {
      id: "sub_live_1",
      status: "canceled",
      customer_id: "ctm_1",
      custom_data: { tenant_id: String(tenantId) },
      canceled_at: occurredAt,
    },
  };
}

async function post(event: unknown, opts?: { tsSeconds?: number }) {
  const body = JSON.stringify(event);
  return POST(request(body, sign(body, opts?.tsSeconds)));
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri(), { dbName: "paddle-webhook-test" });
  await WebhookEvent.syncIndexes();
}, 90_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

beforeEach(async () => {
  await Promise.all([
    Tenant.deleteMany({}),
    Plan.deleteMany({}),
    Subscription.deleteMany({}),
    WebhookEvent.deleteMany({}),
  ]);
  // Tenant traži eksplicitan provisioning (T2B guard) — bez toga `save()` pada.
  const tenant = await Tenant.create({
    name: "Marysoll",
    slug: "marysoll",
    subdomain: "marysoll",
    cloudinaryFolder: "salons/tenant-test",
    ownerId: new Types.ObjectId(),
    plan: "kiki",
    paid: true,
    status: "active",
    verticals: ["beauty"],
    capabilityConfiguration: {},
  });
  tenantId = tenant._id;
  // `cancelSubscriptionFromPaddle` ne radi upsert — samo ažurira postojeći
  // zapis. Otkazana pretplata ionako podrazumeva da je nekad postojala.
  await Subscription.create({
    tenantId,
    plan: "kiki",
    status: "active",
    billingProvider: "paddle",
    paddleSubscriptionId: "sub_live_1",
    paddleCustomerId: "ctm_1",
  });
});

afterEach(() => vi.restoreAllMocks());

// ─── 1. IDEMPOTENCIJA ─────────────────────────────────────────────────────────

describe("ponovljena isporuka", () => {
  it("isti event_id dvaput → pretplata se menja jednom", async () => {
    const event = cancelEvent("evt_dup_1");

    const first = await post(event);
    expect(first.status).toBe(200);
    expect((await readTenant())?.plan).toBe("maria");
    expect((await readTenant())?.paid).toBe(false);

    // Salon se u međuvremenu vratio na plaćeni plan (npr. nova pretplata).
    await Tenant.updateOne(
      { _id: tenantId },
      { $set: { plan: "kiki", paid: true } },
    );

    // Paddle ponavlja isti događaj — OVO je bio incident.
    const replay = await post(event);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ duplicate: true });

    const after = await readTenant();
    expect(after?.plan).toBe("kiki");
    expect(after?.paid).toBe(true);

    expect(await WebhookEvent.countDocuments({})).toBe(1);
  });

  it("dve istovremene isporuke istog događaja → jedan zapis, jedna obrada", async () => {
    const event = cancelEvent("evt_race_1");
    const results = await Promise.all([post(event), post(event)]);

    for (const res of results) expect(res.status).toBe(200);
    // Jedan zapis je ono što se garantuje. Obrada sme da se izvrši i dvaput:
    // duplikat zatečen u statusu `received` ne može da se razlikuje od pada
    // usred obrade, pa se namerno pušta ponovo — a svi upisi su apsolutni
    // `$set`, nikad `$inc`, tako da je ishod isti.
    expect(await WebhookEvent.countDocuments({})).toBe(1);
    const stored = await readEvent("evt_race_1");
    expect(stored?.status).toBe("processed");
    expect(stored?.attempts).toBeGreaterThanOrEqual(1);
    expect((await readTenant())?.plan).toBe("maria");
  });
});

// ─── 2. SVEŽINA POTPISA ───────────────────────────────────────────────────────

describe("svežina potpisa", () => {
  it("zastareo ts → 401 i nijedan upis", async () => {
    const stale = Math.floor(Date.now() / 1000) - 60 * 60;
    const res = await post(cancelEvent("evt_stale_1"), { tsSeconds: stale });

    expect(res.status).toBe(401);
    expect(await WebhookEvent.countDocuments({})).toBe(0);
    expect((await readTenant())?.plan).toBe("kiki");
  });

  it("sat pomeren unapred se takođe odbija", () => {
    const body = JSON.stringify({ a: 1 });
    const future = Math.floor(Date.now() / 1000) + 60 * 60;
    const result = verifyPaddleSignature({
      rawBody: body,
      signature: sign(body, future),
      secret: SECRET,
    });
    expect(result).toMatchObject({ valid: false, reason: "stale" });
  });

  it("neispravan potpis se razlikuje od zastarelog", () => {
    const body = JSON.stringify({ a: 1 });
    expect(
      verifyPaddleSignature({
        rawBody: body,
        signature: "ts=123;h1=deadbeef",
        secret: SECRET,
      }),
    ).toMatchObject({ valid: false, reason: "mismatch" });
  });

  it("validan i svež potpis prolazi", () => {
    const body = JSON.stringify({ a: 1 });
    expect(
      verifyPaddleSignature({ rawBody: body, signature: sign(body), secret: SECRET }),
    ).toMatchObject({ valid: true });
  });
});

// ─── 3. PAD USRED OBRADE ──────────────────────────────────────────────────────

describe("pad usred obrade", () => {
  it("ostavlja `failed` zapis koji se može ponoviti", async () => {
    const event = cancelEvent("evt_fail_1");

    vi.spyOn(Tenant, "findByIdAndUpdate").mockImplementationOnce((() => {
      throw new Error("simulirani pad upisa");
    }) as typeof Tenant.findByIdAndUpdate);

    const failed = await post(event);
    expect(failed.status).toBe(500);

    const stored = await readEvent("evt_fail_1");
    expect(stored?.status).toBe("failed");
    expect(stored?.lastError).toContain("simulirani pad");
    // Nije obrađen — tenant netaknut.
    expect((await readTenant())?.plan).toBe("kiki");

    vi.restoreAllMocks();

    // Paddle ponavlja: `failed` SME ponovo, inače bi dedup progutao događaj
    // koji nikad nije obrađen.
    const retry = await post(event);
    expect(retry.status).toBe(200);
    expect((await readEvent("evt_fail_1"))?.status).toBe("processed");
    expect((await readTenant())?.plan).toBe("maria");
  });

  it("nerazrešen tenant ostaje `failed`, ne nestaje tiho", async () => {
    const orphan = {
      event_id: "evt_orphan_1",
      event_type: "subscription.updated",
      occurred_at: new Date().toISOString(),
      data: { id: "sub_unknown", status: "active", customer_id: null },
    };

    const res = await post(orphan);
    expect(res.status).toBe(500);

    const stored = await readEvent("evt_orphan_1");
    expect(stored?.status).toBe("failed");
    expect(stored?.lastError).toContain("tenant");
    expect(stored?.tenantId).toBeNull();
  });
});

// ─── 4. POSTOJEĆE PONAŠANJE ───────────────────────────────────────────────────

describe("postojeći tokovi ostaju nepromenjeni", () => {
  it("subscription.canceled i dalje obara na maria uz živ sajt", async () => {
    await post(cancelEvent("evt_cancel_ok"));

    const tenant = await readTenant();
    expect(tenant?.plan).toBe("maria");
    expect(tenant?.paid).toBe(false);
    // Sajt OSTAJE živ — javne rute traže status "active".
    expect(tenant?.status).toBe("active");

    const sub = await Subscription.findOne({ tenantId }).lean<{ status: string }>();
    expect(sub?.status).toBe("cancelled");
    expect((await readEvent("evt_cancel_ok"))?.status).toBe("processed");
  });

  it("transaction.* se više ne odbacuje nego čuva kao `skipped`", async () => {
    const res = await post({
      event_id: "evt_txn_1",
      event_type: "transaction.completed",
      occurred_at: new Date().toISOString(),
      data: { id: "txn_1" },
    });

    expect(res.status).toBe(200);
    const stored = await readEvent("evt_txn_1");
    expect(stored?.status).toBe("skipped");
    expect(stored?.skipReason).toContain("nije subscription");
  });

  it("prestignut događaj se ne primenjuje preko novijeg", async () => {
    const now = Date.now();
    // Noviji `canceled` stiže prvi i biva obrađen.
    await post(cancelEvent("evt_new", new Date(now).toISOString()));
    expect((await readTenant())?.plan).toBe("maria");

    // Zakasneo `updated` sa STARIJIM occurred_at ne sme da ga pregazi.
    const late = {
      event_id: "evt_late",
      event_type: "subscription.updated",
      occurred_at: new Date(now - 3_600_000).toISOString(),
      data: {
        id: "sub_live_1",
        status: "active",
        customer_id: "ctm_1",
        custom_data: { tenant_id: String(tenantId) },
      },
    };
    const res = await post(late);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ superseded: true });

    expect((await readTenant())?.plan).toBe("maria");
    expect((await readEvent("evt_late"))?.status).toBe("skipped");
  });
});
