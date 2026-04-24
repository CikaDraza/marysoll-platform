/**
 * app/tenant/usluge — Public services page.
 * Tenant resolved exclusively from x-tenant-slug header (proxy-injected).
 */
import { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import {
  fetchPublicSalonProfile,
  fetchPublicServices,
} from "@/lib/tenant/fetchTenantData";
import ServicesLayout from "./ServiceLayout";
import { TenantPageShell } from "@/components/themes/TenantPageShell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";
  const profile = await fetchPublicSalonProfile(tenantSlug);
  const salonName = profile?.name ?? "Salon";
  const title =
    (profile?.seo as Record<string, string>)?.uslugeTitle ||
    `Usluge — ${salonName}`;
  const description =
    (profile?.seo as Record<string, string>)?.uslugeDescription ||
    `Pogledajte cenovnik usluga salona ${salonName}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function UslugePage() {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";
  const base = h.get("x-tenant-base-path") ?? "";

  const [profile, services] = await Promise.all([
    fetchPublicSalonProfile(tenantSlug),
    fetchPublicServices(tenantSlug),
  ]);

  const salonName = profile?.name ?? "Salon";

  return (
    <TenantPageShell tenantSlug={tenantSlug}>
      <div className="min-h-screen bg-gray-50">
        <section className="max-w-7xl mx-auto px-6 py-16">
          <ServicesLayout services={services} />
        </section>

        <section className="bg-white border-b border-gray-100 py-20 px-6 text-center">
          {services.length === 0 && (
            <p className="text-center bg-white text-gray-500 text-md py-12">
              Usluge još uvek nisu dodate.
            </p>
          )}
        </section>

        <section className="bg-purple-600 py-20 px-6 text-center">
          <p className="text-purple-100 text-xs font-bold tracking-[0.25em] uppercase mb-3">
            {salonName}
          </p>
          <h2 className="text-3xl font-bold text-white mb-4">
            Spremni za zakazivanje?
          </h2>
          <p className="text-white/80 text-sm mb-8 max-w-sm mx-auto">
            Pogledajte slobodne termine i odaberite onaj koji vam odgovara.
          </p>
          <div className="flex items-center justify-center space-x-6">
            <Link
              href={`${base}/termini`}
              className="inline-block px-10 py-4 text-white font-bold rounded-full hover:bg-purple-900 transition"
            >
              Pogledaj slobodne termine →
            </Link>
            <Link
              href={`${base}/termini`}
              className="inline-block px-10 py-4 bg-white text-purple-600 font-bold rounded-full hover:bg-gray-100 transition shadow-lg"
            >
              Zakaži termin →
            </Link>
          </div>
        </section>
      </div>
    </TenantPageShell>
  );
}
