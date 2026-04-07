/**
 * /[tenantSlug]/pravila-zakazivanja — Appointment rules page.
 * Server Component — fetches salon profile to replace hardcoded info.
 */
import { headers } from "next/headers";
import type { Metadata } from "next";
import { fetchPublicSalonProfile } from "@/lib/tenant/fetchTenantData";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenantSlug } = await params;
  const profile = await fetchPublicSalonProfile(tenantSlug);
  return {
    title: `Pravila zakazivanja — ${profile?.name ?? "Salon"}`,
  };
}

export default async function AppointmentRulesPage({ params }: Props) {
  const { tenantSlug } = await params;
  const headersList = await headers();
  const slug = headersList.get("x-tenant-slug") || tenantSlug;

  const profile = await fetchPublicSalonProfile(slug);
  const salonName = profile?.name ?? "Salon";
  const contactEmail = profile?.contactEmail ?? profile?.email ?? "";
  const phone = profile?.phone ?? "";

  return (
    <div className="relative isolate overflow-hidden bg-white px-1 lg:px-16 py-24 sm:py-32 lg:overflow-visible">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <svg
          aria-hidden="true"
          className="absolute top-0 left-[max(50%,25rem)] h-256 w-512 -translate-x-1/2 mask-[radial-gradient(64rem_64rem_at_top,white,transparent)] stroke-gray-200"
        >
          <defs>
            <pattern
              x="50%"
              y={-1}
              id="e813992c-7d03-4cc4-a2bd-151760b470a0"
              width={200}
              height={200}
              patternUnits="userSpaceOnUse"
            >
              <path d="M100 200V.5M.5 .5H200" fill="none" />
            </pattern>
          </defs>
          <svg x="50%" y={-1} className="overflow-visible fill-gray-50">
            <path
              d="M-100.5 0h201v201h-201Z M699.5 0h201v201h-201Z M499.5 400h201v201h-201Z M-300.5 600h201v201h-201Z"
              strokeWidth={0}
            />
          </svg>
          <rect
            fill="url(#e813992c-7d03-4cc4-a2bd-151760b470a0)"
            width="100%"
            height="100%"
            strokeWidth={0}
          />
        </svg>
      </div>

      <div className="mx-auto w-full max-w-full px-1 lg:px-8">
        <div className="w-full">
          <div className="w-full text-center lg:text-left">
            <p className="text-base/7 mb-8 font-semibold text-(--secondary-color)">
              Pravila zakazivanja — {salonName}
            </p>
            <h1 className="mt-2 text-4xl lg:text-6xl 2xl:text-9xl! font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl">
              Način zakazivanja termina
            </h1>
          </div>
        </div>

        <div className="w-full mt-16">
          <div className="w-full text-base/7 text-gray-600">
            <h2 className="mt-16 text-3xl font-bold tracking-tight text-gray-900 max-w-none">
              1. Proces zakazivanja
            </h2>
            <ul role="list" className="mt-8 space-y-8 text-gray-600 max-w-none">
              <li className="flex gap-x-3">
                Registracija i prijava — samo ulogovani korisnici mogu da
                zakazuju termine
              </li>
              <li className="flex gap-x-3">
                Zahtev za termin — korisnik bira datum, vreme i uslugu
              </li>
              <li className="flex gap-x-3">
                Potvrda salona — salon proverava dostupnost i odobrava termin
              </li>
              <li className="flex gap-x-3">
                Zakazano — termin postaje konačan nakon odobrenja
              </li>
            </ul>
            <ul role="list" className="mt-8 space-y-8 text-gray-600 max-w-none">
              <li className="flex gap-x-3">
                <span className="max-w-none">
                  <strong className="font-semibold text-gray-900">
                    🔒 Pristup zakazivanju
                  </strong>{" "}
                  Samo registrovani i ulogovani korisnici mogu da zakazuju
                  termine. Neophodna je verifikacija email adrese pre prvog
                  zakazivanja. Jedan korisnik može imati maksimalno 3 aktivna
                  termina.
                </span>
              </li>
              <li className="flex gap-x-3">
                <span className="max-w-none">
                  <strong className="font-semibold text-gray-900">
                    ✅ Odobrenje termina
                  </strong>{" "}
                  Svi zahtevi za termine moraju biti odobreni od strane salona.
                  Salon će odobriti termin u roku od 24 sata. Dobićete
                  notifikaciju kada vaš termin bude odobren. Termin nije konačan
                  dok ga salon ne odobri.
                </span>
              </li>
              <li className="flex gap-x-3">
                <span className="max-w-none">
                  <strong className="font-semibold text-gray-900">
                    ✏️ Izmena termina
                  </strong>{" "}
                  Klijent može: otkazati termin najkasnije 24 sata pre početka,
                  zatražiti izmenu termina putem chata u aplikaciji. Salon može:
                  pomeriti termin uz prethodni dogovor sa klijentom, predložiti
                  alternativni termin ako je potrebno, otkazati termin u
                  vanrednim situacijama.
                </span>
              </li>
            </ul>

            <h2 className="mt-16 text-3xl font-bold tracking-tight text-gray-900 max-w-none">
              2. Važna pravila
            </h2>
            <ul role="list" className="mt-8 space-y-8 text-gray-600 max-w-none">
              <li className="flex gap-x-3">
                <span className="max-w-none">
                  <strong className="font-semibold text-gray-900">
                    ⏰ Vremenska pravila
                  </strong>{" "}
                  Termin se smatra zakasnelim nakon 15 minuta. Kašnjenje duže od
                  30 minuta — termin se automatski otkazuje. Molimo vas budite
                  tačni radi poštovanja drugih klijenata.
                </span>
              </li>
              <li className="flex gap-x-3">
                <span className="max-w-none">
                  <strong className="font-semibold text-gray-900">
                    🔄 Proces izmene
                  </strong>{" "}
                  Klijent šalje zahtev za izmenu preko chata. Salon proverava
                  dostupnost novog termina. Salon odobrava ili predlaže
                  alternativni termin. Klijent potvrđuje novi termin.
                </span>
              </li>
              <li className="flex gap-x-3">
                <span className="max-w-none">
                  <strong className="font-semibold text-gray-900">
                    ❌ Otkazivanje
                  </strong>{" "}
                  Otkazivanje unutar 24h — bez penala. Otkazivanje u roku manjem
                  od 24h — gubi se depozit (ako postoji). Višestruka otkazivanja
                  mogu dovesti do privremenog onemogućavanja zakazivanja.
                </span>
              </li>
            </ul>

            <h2 className="mt-16 text-3xl font-bold tracking-tight text-gray-900 max-w-none">
              3. Komunikacija
            </h2>
            <ul role="list" className="mt-8 space-y-8 text-gray-600 max-w-none">
              <li className="flex gap-x-3">
                <span className="max-w-none">
                  <strong className="font-semibold text-gray-900">
                    💬 Načini komunikacije
                  </strong>{" "}
                  Chat u aplikaciji — primarni način komunikacije. Email
                  notifikacije — obaveštenja o statusu termina.
                  {phone && ` Telefon (${phone}) — samo za hitne slučajeve.`}
                  {!phone && " Telefon — samo za hitne slučajeve."}
                </span>
              </li>
              <li className="flex gap-x-3">
                <span className="max-w-none">
                  <strong className="font-semibold text-gray-900">
                    🔔 Obaveštenja
                  </strong>{" "}
                  Dobijate automatska obaveštenja za: odobrenje termina,
                  podsetnik 24h pre termina, izmene ili otkazivanje termina i
                  poruke od salona.
                </span>
              </li>
            </ul>

            <h2 className="mt-16 text-3xl font-bold tracking-tight text-gray-900 max-w-none">
              4. Posebne napomene
            </h2>
            <ul role="list" className="mt-8 space-y-8 text-gray-600 max-w-none">
              <li className="flex gap-x-3">
                <span className="max-w-none">
                  <strong className="font-semibold text-gray-900">
                    💄 Za usluge šminkanja
                  </strong>{" "}
                  Molimo vas da dođete sa očišćenim licem. Planirajte dodatnih
                  15 minuta za konsultacije.
                </span>
              </li>
              <li className="flex gap-x-3">
                <span className="max-w-none">
                  <strong className="font-semibold text-gray-900">
                    💅 Za usluge manikira/pedikir
                  </strong>{" "}
                  Donesite svoje alate ako imate specifične zahteve. Obavestite
                  nas o alergijama pre tretmana.
                </span>
              </li>
            </ul>

            <p className="mt-10 max-w-none">
              <strong>Napomena</strong>: Ova pravila su osmišljena kako bismo
              svim klijentima obezbedili kvalitetnu i pravednu uslugu. Hvala vam
              što ih poštujete!
            </p>
            <p className="mt-6 max-w-none">
              Za sva dodatna pitanja, slobodno nas kontaktirajte putem naše
              aplikacije
              {contactEmail && (
                <>
                  {" "}
                  ili na <strong>{contactEmail}</strong>
                </>
              )}
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
