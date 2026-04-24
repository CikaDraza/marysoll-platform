/**
 * app/tenant/pravila-zakazivanja — Appointment rules page.
 * Tenant resolved exclusively from x-tenant-slug header (proxy-injected).
 */
import { headers } from "next/headers";
import type { Metadata } from "next";
import { fetchPublicSalonProfile } from "@/lib/tenant/fetchTenantData";
import { TenantPageShell } from "@/components/themes/TenantPageShell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";
  const profile = await fetchPublicSalonProfile(tenantSlug);
  return {
    title: `Pravila zakazivanja — ${profile?.name ?? "Salon"}`,
  };
}

export default async function AppointmentRulesPage() {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";

  const profile = await fetchPublicSalonProfile(tenantSlug);
  const salonName = profile?.name ?? "Salon";
  const contactEmail = profile?.contactEmail ?? profile?.email ?? "";

  return (
    <TenantPageShell tenantSlug={tenantSlug}>
    <div className="bg-white py-24 lg:py-44">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <span className="text-base/7 font-semibold text-(--primary-color)">
            {salonName}
          </span>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            Pravila zakazivanja
          </h1>
        </div>

        <div className="mx-auto mt-16 max-w-3xl space-y-8 text-gray-700 text-base/7">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Zakazivanje termina
            </h2>
            <p>
              Termini se zakazuju isključivo putem naše aplikacije. Nakon
              registracije i prijave, možete odabrati uslugu i slobodan termin
              koji vam odgovara.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Otkazivanje termina
            </h2>
            <p>
              Molimo vas da otkazivanje termina izvršite najmanje 24 sata pre
              zakazanog vremena. Kasno otkazivanje ili nedolazak bez
              obaveštenja može rezultovati ograničenjem korišćenja usluga.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Kašnjenje
            </h2>
            <p>
              U slučaju kašnjenja više od 15 minuta, salon zadržava pravo da
              termin dodeli drugom korisniku. Molimo vas da budete tačni.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Kontakt</h2>
            <p>
              Za sva pitanja vezana za zakazivanje, kontaktirajte nas
              {contactEmail ? (
                <>
                  {" "}
                  na <strong>{contactEmail}</strong>.
                </>
              ) : (
                " putem naše aplikacije."
              )}
            </p>
          </section>
        </div>
      </div>
    </div>
    </TenantPageShell>
  );
}
