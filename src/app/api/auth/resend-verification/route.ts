import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { Tenant } from "@/models/Tenant";
import {
  sendClientVerificationEmail,
  sendOwnerVerificationEmail,
} from "@/lib/email/onboarding";

/**
 * POST /api/auth/resend-verification
 *
 * Dva ulaza, jer se stranica otvara sa dva različita domena:
 *
 *  1. Tenant domen ({slug}.marysoll.com / custom domen) — proxy ubaci
 *     `x-tenant-slug`, pa je pretraga tenant-scoped: svaki salon vodi svoju
 *     verifikaciju nezavisno i klijent jednog salona ne može da trigeruje mejl
 *     za isti email u drugom salonu.
 *
 *  2. Platformski domen (marysoll.com/resend-verification) — proxy tamo
 *     postavlja PRAZAN `x-tenant-slug` (apex je "marketing" tip), pa sluga
 *     nema. Tada se nalog traži globalno po emailu među management ulogama,
 *     isto kao /api/auth/login koji na istom domenu nalazi vlasnika bez sluga.
 *     Bez ovog puta je "Nisam dobio/la email za verifikaciju" na marysoll.com
 *     vraćao 200 i poruku o uspehu, a nijedan mejl nije slao.
 *
 * Odgovor je uvek ista poruka — bez obzira da li nalog postoji, da li je već
 * verifikovan i kojim putem je nađen — da se ne otvori enumeracija naloga.
 */

/** Uloge koje se prijavljuju preko platformskog logina (CLIENT ide na salon URL). */
const MANAGEMENT_ROLES = ["OWNER", "ADMIN", "STAFF"] as const;

const GENERIC_RESPONSE = {
  message: "Ako nalog postoji i nije verifikovan, novi link je poslat.",
};

export async function POST(req: NextRequest) {
  try {
    await connectToDB();

    const { email, tenantSlug: bodyTenantSlug } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email je obavezan." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const tenantSlugFromHeader = req.headers.get("x-tenant-slug");
    const resolvedTenantSlug =
      tenantSlugFromHeader && tenantSlugFromHeader !== "default"
        ? tenantSlugFromHeader
        : bodyTenantSlug || null;

    let tenantUser = null;

    if (resolvedTenantSlug) {
      // ── 1. Tenant domen: nalog mora biti u TOM salonu ──────────────────────
      const scopedTenant = await Tenant.findOne({ slug: resolvedTenantSlug })
        .select("_id")
        .lean<{ _id: import("mongoose").Types.ObjectId }>();

      if (scopedTenant) {
        tenantUser = await TenantUser.findOne({
          tenantId: scopedTenant._id,
          email: normalizedEmail,
        });
      }
    } else {
      // ── 2. Platformski domen: nađi neverifikovan nalog po emailu ───────────
      // `isEmailVerified: false` stoji u upitu (a ne tek u proveri ispod) jer
      // ista osoba može biti verifikovan ADMIN u jednom salonu i neverifikovan
      // OWNER u drugom — resend mora da cilja onaj koji je zapravo blokiran.
      //
      // Management ide prvi: te uloge se i prijavljuju na marysoll.com/login,
      // a sortiranje po `role` je isto kao u /api/auth/login, pa oba biraju
      // isti nalog kad ih ima više.
      tenantUser = await TenantUser.findOne({
        email: normalizedEmail,
        role: { $in: MANAGEMENT_ROLES },
        isEmailVerified: false,
      }).sort({ role: 1 });

      // Klijent salona (USER/GUEST) kao druga runda: njegov verifikacioni link
      // vodi na apex jer `/verify-email` ne postoji na tenant domenu (nije u
      // CLIENT_TENANT_PATHS). Kad mu link istekne, završi na
      // marysoll.com/resend-verification — bez ove grane bi i ponovni pokušaj
      // tiho prošao bez mejla. Najnoviji nalog, jer je isti email mogao da se
      // registruje u više salona.
      if (!tenantUser) {
        tenantUser = await TenantUser.findOne({
          email: normalizedEmail,
          role: { $nin: MANAGEMENT_ROLES },
          isEmailVerified: false,
        }).sort({ createdAt: -1 });
      }
    }

    if (!tenantUser || tenantUser.isEmailVerified) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const tenant = await Tenant.findById(tenantUser.tenantId)
      .select("_id name slug")
      .lean<{
        _id: import("mongoose").Types.ObjectId;
        name: string;
        slug: string;
      }>();

    if (!tenant) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    tenantUser.verificationToken = verificationToken;
    tenantUser.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await tenantUser.save();

    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
    const salonBaseUrl = `https://${tenant.slug}.${baseDomain}`;

    if (tenantUser.role === "OWNER") {
      await sendOwnerVerificationEmail({
        email: tenantUser.email,
        ownerName: tenantUser.name,
        salonName: tenant.name,
        verificationToken,
        subdomain: `${tenant.slug}.${baseDomain}`,
      });
    } else {
      await sendClientVerificationEmail({
        email: tenantUser.email,
        clientName: tenantUser.name,
        salonName: tenant.name,
        verificationToken,
        salonBaseUrl,
        tenantId: tenant._id.toString(),
      });
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("❌ Resend verification error:", error);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}
