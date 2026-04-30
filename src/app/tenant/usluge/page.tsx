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
import { LandingStructure, SalonProfileData } from "@/types";

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

  const safeProfile: SalonProfileData = profile ?? {
    _id: "",
    name: "",
    email: "",
    description: "",
    phone: "",
    street: "",
    city: "",
    social: {},
    newsletterEmail: "",
  };

  const salonName = profile?.name ?? "Salon";

  const landingStructure = safeProfile.landingStructure as LandingStructure;
  const servicesPage = landingStructure?.pages?.servicesPage;
  const appointmentsPage = landingStructure?.pages?.appointmentsPage;

  return (
    <TenantPageShell tenantSlug={tenantSlug}>
      <div className="min-h-screen bg-gray-100">
        <section className="max-w-7xl mx-auto px-6 py-16">
          <ServicesLayout
            services={services}
            headline={
              servicesPage?.headline || "Nase usluge i cene bez trikova"
            }
            subheadline={
              servicesPage?.subheadline ||
              "Profesionalna šminka za sve prilike, od dnevne do večernje. Nega lica, obrva i noktiju. Otkrijte našu paletu usluga i tretmana dizajniranih da istaknu vašu prirodnu lepotu."
            }
          />
        </section>

        {services.length === 0 && (
          <section className="bg-white border-b border-gray-100 py-20 px-6 text-center">
            <p className="text-center bg-white text-gray-500 text-md py-12">
              Usluge još uvek nisu dodate.
            </p>
          </section>
        )}

        <section className="bg-(--secondary-color) py-44 px-6 text-center">
          <p className="text-(--primary-color) text-xs font-bold tracking-[0.25em] uppercase mb-3">
            {salonName}
          </p>
          <h2 className="text-3xl font-bold text-(--primary-color) mb-4">
            {appointmentsPage?.headline}
          </h2>
          <p className="text-(--primary-color)/80 text-sm mb-8 max-w-sm mx-auto">
            {appointmentsPage?.subheadline}
          </p>
          <div className="flex items-center justify-center space-x-6">
            <Link
              href={`${base}/termini`}
              className="inline-block px-10 py-4 text-(--primary-color) hover:text-white font-bold rounded-full outline-1 outline-(--primary-color) hover:bg-(--primary-color) transition"
            >
              Pogledaj slobodne termine →
            </Link>
            <Link
              href={`${base}/termini`}
              className="inline-block px-10 py-4 bg-white text-(--primary-color) font-bold rounded-full hover:bg-gray-100 transition shadow-lg"
            >
              Zakaži termin →
            </Link>
          </div>
        </section>
      </div>
    </TenantPageShell>
  );
}
