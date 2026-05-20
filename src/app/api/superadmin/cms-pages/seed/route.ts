// POST /api/superadmin/cms-pages/seed
// Seeds default privacy, terms, and refund-policy pages if they don't exist.
// Safe to call multiple times (idempotent).
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { ProfilPlatforme } from "@/models/ProfilPlatforme";

const today = new Date().toLocaleDateString("sr-Latn");

const DEFAULT_PAGES = [
  {
    slug: "privacy",
    title: "Politika privatnosti",
    content: `# Politika privatnosti

Poslednje ažuriranje: ${today}

## Ko smo mi

Marysoll je SaaS platforma za beauty salone. Ova politika privatnosti objašnjava kako prikupljamo i koristimo vaše podatke.

## Koje podatke prikupljamo

- Ime i prezime
- Email adresa
- Broj telefona (opciono)
- Informacije o terminima

## Kako koristimo podatke

Vaše podatke koristimo isključivo za:
- Upravljanje terminima
- Slanje podsetnika
- Poboljšanje usluge

## Čuvanje podataka

Vaši podaci se čuvaju na sigurnim serverima. Ne delimo vaše podatke sa trećim licima bez vašeg pristanka.

## Vaša prava

Imate pravo da zatražite brisanje vaših podataka. Kontaktirajte nas na: kontakt@marysoll.com

## Kontakt

Za sva pitanja: kontakt@marysoll.com`,
  },
  {
    slug: "terms-and-conditions",
    title: "Uslovi korišćenja",
    content: `# Uslovi korišćenja

Poslednje ažuriranje: ${today}

## Prihvatanje uslova

Korišćenjem Marysoll platforme prihvatate ove uslove korišćenja.

## Opis usluge

Marysoll pruža softver za upravljanje salonima, zakazivanje termina i komunikaciju sa klijentima.

## Pretplata i plaćanje

- Pretplate se naplaćuju mesečno ili godišnje
- Plaćanje se vrši unapred
- Cene su prikazane bez PDV-a gde se primenjuje

## Otkazivanje

Pretplatu možete otkazati u bilo kom trenutku. Pristup ostaje aktivan do kraja plaćenog perioda.

## Ograničenje odgovornosti

Marysoll ne odgovara za indirektne štete nastale korišćenjem platforme.

## Izmene uslova

Zadržavamo pravo izmene ovih uslova uz prethodno obaveštenje korisnika.

## Kontakt

Za sva pitanja: kontakt@marysoll.com`,
  },
  {
    slug: "refund",
    title: "Politika povraćaja",
    content: `# Politika povraćaja

Poslednje ažuriranje: ${today}

## Pravo na povraćaj

Nudimo 14-dnevnu garanciju povraćaja novca za sve nove pretplate.

## Uslovi za povraćaj

- Zahtev za povraćaj mora biti podnet u roku od 14 dana od prvog plaćanja
- Povraćaj se odnosi isključivo na prvu pretplatu (ne na obnove)
- Godišnje pretplate: povraćaj za neiskorišćene mesece na zahtev

## Kako zatražiti povraćaj

Pošaljite email na kontakt@marysoll.com sa:
- Imenom i email adresom naloga
- Razlogom za povraćaj

## Rok obrade

Povraćaj se obrađuje u roku od 5-10 radnih dana.

## Izuzeci

Povraćaj nije moguć za:
- Mesece koji su već iskorišćeni
- Naloge koji su prekršili Uslove korišćenja

## Kontakt

Za sva pitanja: kontakt@marysoll.com`,
  },
  {
    slug: "pricing",
    title: "Cenovnik",
    content: `# Cenovnik

Izaberite plan koji odgovara vašem salonu. Bez skrivenih troškova.

## Šta je uključeno u svaki plan?

- Zakazivanje termina online
- Upravljanje klijentima i istorija
- Podsetnici putem SMS i emaila
- Podrška putem emaila

## Planovi

Detaljni pregled planova i cena dostupan je ispod.

*Svi planovi uključuju 14-dnevni besplatni period bez kreditne kartice.*`,
  },
  {
    slug: "kontakt",
    title: "Kontaktirajte nas",
    content: "Imate pitanje? Pišite nam — odgovaramo u roku od jednog radnog dana.",
  },
];

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();

    const profile = await ProfilPlatforme.findOneAndUpdate(
      {},
      { $setOnInsert: {} },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const existing = profile.cmsPages ?? {};
    const seeded: string[] = [];
    const updates: Record<string, unknown> = {};

    for (const page of DEFAULT_PAGES) {
      if (!existing[page.slug]) {
        updates[`cmsPages.${page.slug}`] = { ...page, updatedAt: new Date() };
        seeded.push(page.slug);
      }
    }

    // Remove old slugs that were renamed
    const RENAMED: string[] = ["terms", "refund-policy"];
    const toRemove = RENAMED.filter((s) => existing[s]);
    const unsets: Record<string, string> = {};
    for (const s of toRemove) unsets[`cmsPages.${s}`] = "";

    if (Object.keys(updates).length > 0 || Object.keys(unsets).length > 0) {
      await ProfilPlatforme.findByIdAndUpdate(profile._id, {
        ...(Object.keys(updates).length > 0 ? { $set: updates } : {}),
        ...(Object.keys(unsets).length > 0 ? { $unset: unsets } : {}),
      });
    }

    return NextResponse.json({ ok: true, seeded, removed: toRemove });
  } catch (err) {
    console.error("[POST /api/superadmin/cms-pages/seed]", err);
    return NextResponse.json({ error: "Greška pri seed-ovanju" }, { status: 500 });
  }
}
