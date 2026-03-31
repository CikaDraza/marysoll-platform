/**
 * (public)/[tenantSlug]/termini — Public appointments calendar page.
 *
 * Server Component. Reads x-domain-type header to determine whether
 * we are on a custom domain — if so, links use root-relative paths
 * (/panel, /register) instead of /[slug]/panel so they work correctly
 * on kikikiss.beauty without exposing the internal slug in the URL.
 */
import { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import {
  fetchPublicSalonProfile,
  fetchPublicAppointments,
} from "@/lib/tenant/fetchTenantData";
import AppointmentCalendarPage from "@/components/public/AppointmentCalendarPage";
import type { IAppointment, SalonProfileData } from "@/types";
import { WorkingHoursWidget } from "@/components/widgets/WorkingHoursWidget";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenantSlug } = await params;
  const profile = await fetchPublicSalonProfile(tenantSlug);
  const salonName = profile?.name ?? "Salon";
  const title =
    (profile?.seo as Record<string, string>)?.terminiTitle ||
    `Termini — ${salonName}`;
  const description =
    (profile?.seo as Record<string, string>)?.terminiDescription ||
    `Pogledajte slobodne termine i zakažite posetu u salonu ${salonName}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function TerminiPage({ params }: Props) {
  const { tenantSlug } = await params;

  const headersList = await headers();
  const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
  const host = headersList.get("host")?.split(":")[0] ?? "";
  const onCustomDomain =
    host !== "localhost" &&
    !host.startsWith("127.") &&
    !host.endsWith(BASE_DOMAIN) &&
    host !== BASE_DOMAIN;

  // On custom domain: links are root-relative (/panel, /register)
  // On path-based:    links include slug (/kiki-makeup/panel)
  const base = onCustomDomain ? "" : `/${tenantSlug}`;

  const [profile, appointments] = await Promise.all([
    fetchPublicSalonProfile(tenantSlug),
    fetchPublicAppointments(tenantSlug),
  ]);

  const salonName = profile?.name ?? "Salon";
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero header */}
      <section className="bg-white border-b border-gray-100 py-16 px-6 text-center">
        <p className="text-purple-600 text-xs font-bold tracking-[0.25em] uppercase mb-3">
          {salonName}
        </p>
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
          Termini
        </h1>
        <p className="text-gray-500 text-sm max-w-2xl mx-auto mb-8">
          Pogledajte slobodne termine u kalendaru ispod. Zakazivanje je dostupno
          registrovanim korisnicima.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href={`${base}/panel?tab=Zakazivanja`}
            className="px-7 py-3 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700 transition text-sm"
          >
            Zakaži termin →
          </Link>
          <Link
            href={`${base}/usluge`}
            className="px-7 py-3 border border-gray-200 text-gray-700 font-semibold rounded-full hover:border-gray-400 transition text-sm"
          >
            Cenovnik usluga
          </Link>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* GORNJI RED: Definisan kao grid sa 5 redova */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-2 gap-x-3"
          style={{
            display: "grid",
            gridTemplateRows: "repeat(5, minmax(0, 1fr))",
            gridTemplateAreas: `
        "working legend"
        "working legend"
        "working howto"
        "working howto"
        "working rules"
      `,
          }}
        >
          {/* Radno Vreme - Zauzima celu levu stranu (5 redova) */}
          <div style={{ gridArea: "working" }} className="h-full">
            <WorkingHoursWidget profile={safeProfile} />
          </div>

          {/* Legenda - Zauzima 2 reda desno */}
          <div
            style={{ gridArea: "legend" }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-center"
          >
            <h3 className="font-bold text-gray-800 mb-3 text-sm">📋 Legenda</h3>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded border border-gray-200 bg-white" />{" "}
                Radno vreme
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded border border-gray-200 bg-[#fffadf]" />{" "}
                Današnji dan
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded border border-gray-200 bg-[#f3f3f3]" />{" "}
                Salon ne radi
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-purple-500" /> Zauzet termin
              </li>
            </ul>
          </div>

          {/* Kako zakazati - Zauzima 2 reda desno */}
          <div
            style={{ gridArea: "howto" }}
            className="bg-purple-50 border border-purple-100 rounded-2xl p-6 flex flex-col justify-center"
          >
            <h3 className="font-bold font-semibold text-purple-800 mb-2">
              Kako zakazati?
            </h3>
            <ol className="text-xs text-purple-700 space-y-1 list-decimal pl-4 mb-3">
              <li>Registrujte se</li>
              <li>Kliknite &quot;Zakaži termin&quot;</li>
              <li>Odaberite uslugu</li>
            </ol>
            <Link
              href={`${base}/register`}
              className="w-fit px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl"
            >
              Kreiraj nalog →
            </Link>
          </div>

          {/* Pravila - Zauzima 1 red desno */}
          <div
            style={{ gridArea: "rules" }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-start justify-between"
          >
            <h3 className="font-bold text-gray-800 text-md">Pravila salona</h3>
            <Link
              href={`${base}/pravila-salona-zakazivanje`}
              className="text-gray-600 text-sm font-bold hover:underline"
            >
              Saznaj više →
            </Link>
          </div>
        </div>

        {/* DONJI RED: Kalendar (ispod grida, puna širina) */}
        <div className="mt-8">
          <AppointmentCalendarPage
            initialAppointments={appointments as IAppointment[]}
            salonProfile={safeProfile}
            tenantSlug={tenantSlug}
          />
        </div>
      </div>
    </div>
  );
}
