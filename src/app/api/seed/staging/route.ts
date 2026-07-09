/**
 * POST/GET /api/seed/staging?secret=...  (&reset=true)
 *
 * Synthetic seed za QA na STAGING-u (marysoll_staging). Pravi 2 demo tenanta
 * (Kiki Kiss Beauty, Shi Sham) sa vlasnikom, uslugama i — najbitnije za merge QA —
 * duplikat par: GOST + REGISTROVAN klijent sa ISTIM telefonom (loyalty iz ledgera,
 * termini, vaučeri), tako da se odmah vidi "Mogući duplikati" i before→after zbir.
 *
 * TROSTRUKI GUARD: SEED_SECRET env + secret param + SAMO na staging-u
 * (NEXT_PUBLIC_BASE_DOMAIN=staging.*). Nikad ne radi na produkciji.
 * Idempotentno: ako tenant postoji → preskače; `?reset=true` obriše demo podatke pa iznova.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { AuthUser } from "@/models/AuthUser";
import { Tenant } from "@/models/Tenant";
import { TenantUser } from "@/models/TenantUser";
import { Service } from "@/models/Service";
import { Appointment } from "@/models/Appointment";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { LoyaltyEvent } from "@/models/LoyaltyEvent";
import { Voucher } from "@/models/Voucher";

const PASSWORD = process.env.STAGING_SEED_PASSWORD ?? "Staging123!";

interface TenantSpec {
  name: string;
  slug: string;
  plan: "maria" | "claudia" | "kiki" | "enterprise";
  ownerEmail: string;
  clientEmail: string;
  phone: string; // deljeni telefon gosta i registrovanog (duplikat par)
  services: Array<{ name: string; price: number; duration: number }>;
}

const SPECS: TenantSpec[] = [
  {
    name: "Kiki Kiss Beauty",
    slug: "kiki-kiss-beauty",
    plan: "kiki",
    ownerEmail: "owner.kiki@staging.marysoll.com",
    clientEmail: "ana.kiki@staging.marysoll.com",
    phone: "+381601234567",
    services: [
      { name: "Klasične trepavice", price: 3000, duration: 90 },
      { name: "Volumen 3D", price: 4000, duration: 120 },
    ],
  },
  {
    name: "Shi Sham Frizerski Salon",
    slug: "shi-sham",
    plan: "claudia",
    ownerEmail: "owner.shisham@staging.marysoll.com",
    clientEmail: "ana.shisham@staging.marysoll.com",
    phone: "+381649876543",
    services: [
      { name: "Šišanje i feniranje", price: 2000, duration: 45 },
      { name: "Farbanje", price: 3500, duration: 90 },
    ],
  },
];

async function deleteTenantData(tenantId: Types.ObjectId) {
  await Promise.all([
    TenantUser.deleteMany({ tenantId }),
    Service.deleteMany({ tenantId }),
    Appointment.deleteMany({ tenantId }),
    LoyaltyAccount.deleteMany({ tenantId }),
    LoyaltyLedger.deleteMany({ tenantId }),
    LoyaltyEvent.deleteMany({ tenantId }),
    Voucher.deleteMany({ tenantId }),
  ]);
}

async function makeAppointments(params: {
  tenantId: Types.ObjectId;
  clientId: Types.ObjectId;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  service: { _id: Types.ObjectId; name: string; price: number; duration: number };
  count: number;
}) {
  const docs = [];
  for (let i = 0; i < params.count; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (i + 1) * 7);
    docs.push({
      tenantId: params.tenantId,
      clientProfileId: params.clientId,
      clientName: params.clientName,
      clientEmail: params.clientEmail,
      clientPhone: params.clientPhone,
      serviceName: params.service.name,
      date: d.toISOString().slice(0, 10),
      time: "10:00",
      duration: params.service.duration,
      status: "completed",
      services: [
        {
          serviceId: params.service._id,
          serviceName: params.service.name,
          price: params.service.price,
          duration: params.service.duration,
          quantity: 1,
        },
      ],
    });
  }
  if (docs.length) await Appointment.insertMany(docs);
}

async function seedLoyalty(params: {
  tenantId: Types.ObjectId;
  clientId: Types.ObjectId;
  keyPrefix: string;
  hearts: number;
  points: number;
  visits: number;
  spend: number;
}) {
  const account = await LoyaltyAccount.create({
    tenantId: params.tenantId,
    tenantUserId: params.clientId,
    heartsBalance: params.hearts,
    pointsBalance: params.points,
    lifetimeHearts: params.hearts,
    lifetimePoints: params.points,
    completedVisits: params.visits,
    totalSpend: params.spend,
    lastVisitAt: new Date(),
  });
  // Ledger MORA da poklopi balans (merge radi recomputeAccount iz ledgera).
  const entries = [];
  if (params.hearts > 0) {
    entries.push({
      tenantId: params.tenantId,
      accountId: account._id,
      tenantUserId: params.clientId,
      entryType: "earn",
      currency: "hearts",
      amount: params.hearts,
      idempotencyKey: `seed_${params.keyPrefix}_hearts`,
      description: "Seed: srca za posete",
    });
  }
  if (params.points > 0) {
    entries.push({
      tenantId: params.tenantId,
      accountId: account._id,
      tenantUserId: params.clientId,
      entryType: "earn",
      currency: "points",
      amount: params.points,
      idempotencyKey: `seed_${params.keyPrefix}_points`,
      description: "Seed: poeni za potrošnju",
    });
  }
  if (entries.length) await LoyaltyLedger.insertMany(entries);

  await LoyaltyEvent.create({
    tenantId: params.tenantId,
    type: "appointment_completed",
    sourceType: "appointment",
    sourceId: `seed_${params.keyPrefix}`,
    subjectTenantUserId: params.clientId,
    status: "processed",
  });
  return account;
}

async function seedTenant(spec: TenantSpec, hashed: string) {
  // Owner AuthUser (za Tenant.ownerId — login ide preko TenantUser-a).
  const authOwner = await AuthUser.create({
    email: spec.ownerEmail.toLowerCase(),
    passwordHash: hashed,
    isEmailVerified: true,
    platformRole: "OWNER",
  });

  const tenant = await Tenant.create({
    name: spec.name,
    slug: spec.slug,
    subdomain: spec.slug,
    plan: spec.plan,
    status: "active",
    isDemo: true,
    verified: true,
    paid: true,
    ownerId: authOwner._id,
    cloudinaryFolder: `staging/${spec.slug}`,
  });

  // Owner TenantUser (login: /api/auth/login → TenantUser sa OWNER rolom).
  await TenantUser.create({
    tenantId: tenant._id,
    authUserId: authOwner._id,
    email: spec.ownerEmail.toLowerCase(),
    password: hashed,
    isEmailVerified: true,
    status: "active",
    name: `Vlasnik ${spec.name}`,
    role: "OWNER",
  });

  // Usluge.
  const services = await Service.insertMany(
    spec.services.map((s) => ({
      tenantId: tenant._id,
      name: s.name,
      category: "Usluge",
      type: "single",
      priceMode: "fixed",
      price: s.price,
      duration: s.duration,
    })),
  );
  const primary = {
    _id: services[0]._id as Types.ObjectId,
    name: spec.services[0].name,
    price: spec.services[0].price,
    duration: spec.services[0].duration,
  };

  // ── Duplikat par: GOST + REGISTROVAN sa ISTIM telefonom ──
  // Guest A: ❤️3 ⭐120 Termini 4 Vaučeri 2  |  User B: ❤️1 ⭐50 Termini 1 Vaučeri 0
  // Posle merge-a (A→B): ❤️4 ⭐170 Termini 5 Vaučeri 2
  const guest = await TenantUser.create({
    tenantId: tenant._id,
    email: `guest_ana_${spec.slug}@noemail.guest`,
    password: hashed,
    isEmailVerified: false,
    status: "active",
    name: "Ana (gost)",
    phone: spec.phone,
    role: "GUEST",
  });
  const registered = await TenantUser.create({
    tenantId: tenant._id,
    email: spec.clientEmail.toLowerCase(),
    password: hashed,
    isEmailVerified: true,
    status: "active",
    name: "Ana Anić",
    phone: spec.phone, // ISTI telefon → duplikat kandidat
    role: "USER",
  });

  await seedLoyalty({
    tenantId: tenant._id,
    clientId: guest._id,
    keyPrefix: `${spec.slug}_guest`,
    hearts: 3,
    points: 120,
    visits: 4,
    spend: 12000,
  });
  await seedLoyalty({
    tenantId: tenant._id,
    clientId: registered._id,
    keyPrefix: `${spec.slug}_user`,
    hearts: 1,
    points: 50,
    visits: 1,
    spend: 3000,
  });

  await makeAppointments({
    tenantId: tenant._id,
    clientId: guest._id,
    clientName: "Ana (gost)",
    clientEmail: guest.email,
    clientPhone: spec.phone,
    service: primary,
    count: 4,
  });
  await makeAppointments({
    tenantId: tenant._id,
    clientId: registered._id,
    clientName: "Ana Anić",
    clientEmail: registered.email,
    clientPhone: spec.phone,
    service: primary,
    count: 1,
  });

  // Guest ima 2 vaučera (Milanov primer).
  await Voucher.insertMany([
    {
      tenantId: tenant._id,
      code: `SEED-${spec.slug.toUpperCase().slice(0, 6)}-1`,
      type: "percent",
      value: 15,
      origin: "manual",
      status: "active",
      ownerTenantUserId: guest._id,
      expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000),
    },
    {
      tenantId: tenant._id,
      code: `SEED-${spec.slug.toUpperCase().slice(0, 6)}-2`,
      type: "fixed",
      value: 500,
      origin: "gift",
      status: "active",
      ownerTenantUserId: guest._id,
      expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000),
    },
  ]);

  return {
    tenant: spec.name,
    slug: spec.slug,
    siteUrl: `https://${spec.slug}.staging.marysoll.com`,
    ownerLogin: spec.ownerEmail,
    clientLogin: spec.clientEmail,
    mergePair: { guestId: String(guest._id), registeredId: String(registered._id), phone: spec.phone },
  };
}

async function runSeed(
  secret: string | null,
  reset: boolean,
  wipe: boolean,
) {
  const seedSecret = process.env.SEED_SECRET;
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
  const isStaging = baseDomain.startsWith("staging.");

  // GUARD 1: samo na staging-u.
  if (!isStaging) {
    return NextResponse.json(
      { error: "Seed radi samo na staging okruženju." },
      { status: 403 },
    );
  }
  // GUARD 2: SEED_SECRET mora biti konfigurisan.
  if (!seedSecret) {
    return NextResponse.json(
      { error: "Seed je isključen (SEED_SECRET nije postavljen)." },
      { status: 403 },
    );
  }
  // GUARD 3: tačan secret.
  if (!secret || secret !== seedSecret) {
    return NextResponse.json({ error: "Nevažeći seed secret." }, { status: 401 });
  }

  const conn = await connectToDB();
  const dbName = conn.connection?.db?.databaseName ?? null;

  const slugs = SPECS.map((s) => s.slug);
  const ownerEmails = SPECS.map((s) => s.ownerEmail.toLowerCase());
  const existing = await Tenant.find({ slug: { $in: slugs } })
    .select("_id slug")
    .lean<{ _id: Types.ObjectId; slug: string }[]>();

  // ── WIPE: samo obriši demo podatke (bez sejanja) — čišćenje pogrešne baze. ──
  if (wipe) {
    for (const t of existing) await deleteTenantData(t._id);
    await Tenant.deleteMany({ slug: { $in: slugs } });
    await AuthUser.deleteMany({ email: { $in: ownerEmails } });
    return NextResponse.json({
      wiped: true,
      dbName, // gde je čišćeno — proveri da je očekivana baza!
      removedTenants: existing.map((t) => t.slug),
    });
  }

  if (existing.length > 0) {
    if (!reset) {
      return NextResponse.json({
        message:
          "Već posejano. &reset=true = obriši+posej iznova. &wipe=true = samo obriši.",
        dbName,
        existing: existing.map((t) => t.slug),
      });
    }
    // reset: obriši demo podatke + vlasnike (scope: samo demo tenanti).
    for (const t of existing) await deleteTenantData(t._id);
    await Tenant.deleteMany({ slug: { $in: slugs } });
    await AuthUser.deleteMany({ email: { $in: ownerEmails } });
  }

  const hashed = await bcrypt.hash(PASSWORD, 12);
  const results = [];
  for (const spec of SPECS) results.push(await seedTenant(spec, hashed));

  return NextResponse.json({
    success: true,
    dbName, // potvrda u koju bazu je posejano
    password: PASSWORD,
    note: "Login (admin): /api/auth/login ili staging login sa ownerLogin+password. Merge QA: admin dashboard → Growth Studio → Mogući duplikati.",
    tenants: results,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  return runSeed(
    searchParams.get("secret"),
    searchParams.get("reset") === "true",
    searchParams.get("wipe") === "true",
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { secret, reset, wipe } = (body ?? {}) as {
    secret?: string;
    reset?: boolean;
    wipe?: boolean;
  };
  const { searchParams } = new URL(req.url);
  return runSeed(
    secret ?? searchParams.get("secret"),
    reset === true || searchParams.get("reset") === "true",
    wipe === true || searchParams.get("wipe") === "true",
  );
}
