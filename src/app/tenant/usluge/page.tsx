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
import Image from "next/image";

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
            paragraph={servicesPage?.paragraph}
          />
        </section>

        {services.length === 0 && (
          <section className="bg-white border-b border-gray-100 py-20 px-6 text-center">
            <p className="text-center bg-white text-gray-500 text-md py-12">
              Usluge još uvek nisu dodate.
            </p>
          </section>
        )}

        <section className="relative isolate overflow-hidden bg-gray-950 text-left py-44 px-6 text-white lg:px-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gray-950/75 backdrop-blur-[2px] md:bg-gradient-to-r md:from-gray-950/90 md:via-gray-950/70 md:to-gray-950/35"
          />
          <div
            aria-hidden="true"
            className="hidden sm:absolute sm:-top-10 sm:right-1/2 sm:-z-10 sm:mr-10 sm:block sm:transform-gpu sm:blur-3xl"
          >
            <div
              style={{
                clipPath:
                  "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              }}
              className="aspect-1097/845 w-274.25 bg-linear-to-tr from-[#ff4694] to-[#776fff] opacity-20"
            />
          </div>
          <div
            aria-hidden="true"
            className="absolute -top-52 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl sm:-top-112 sm:ml-16 sm:translate-x-0"
          >
            <div
              style={{
                clipPath:
                  "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              }}
              className="aspect-1097/845 w-274.25 bg-linear-to-tr from-[#ff4694] to-[#776fff] opacity-20"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center space-x-6">
            <div className="mx-auto w-full text-center">
              <small className="text-center text-[#a8876c] text-xs font-bold tracking-[0.25em] uppercase mb-3">
                {salonName}
              </small>
              <h2 className="text-3xl font-bold text-[#a8876c] mb-4">
                {appointmentsPage?.headline}
              </h2>
              <p className="text-[#a8876c]/80 text-sm mb-8 max-w-sm mx-auto">
                {appointmentsPage?.subheadline}
              </p>
              {appointmentsPage?.paragraph && (
                <p className="text-[#a8876c]/75 text-sm leading-7 mb-8 max-w-2xl mx-auto">
                  {appointmentsPage.paragraph}
                </p>
              )}
            </div>
            <Link
              href={`${base}/termini`}
              className="inline-block px-10 py-4 text-[#a8876c] hover:text-white font-bold rounded-full outline-1 outline-[#a8876c] hover:bg-[#a8876c] transition"
            >
              Pogledaj slobodne termine →
            </Link>
            <Link
              href={`${base}/termini`}
              className="inline-block px-10 py-4 bg-white text-[#a8876c] font-bold rounded-full hover:bg-gray-100 transition shadow-lg"
            >
              Zakaži termin →
            </Link>
          </div>
        </section>
      </div>
    </TenantPageShell>
  );
}
