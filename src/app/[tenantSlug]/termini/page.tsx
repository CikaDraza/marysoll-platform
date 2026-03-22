/**
 * /[tenantSlug]/termini — Public appointments calendar page.
 *
 * Server Component — fetches appointments and salon profile server-side.
 * Fully public — anyone can view the calendar to see availability.
 * Booking requires login (redirects to /panel?tab=Zakazivanja).
 */
import { Metadata } from "next";
import Link from "next/link";
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
            href={`/${tenantSlug}/panel?tab=Zakazivanja`}
            className="px-7 py-3 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700 transition text-sm"
          >
            Zakaži termin →
          </Link>
          <Link
            href={`/${tenantSlug}/usluge`}
            className="px-7 py-3 border border-gray-200 text-gray-700 font-semibold rounded-full hover:border-gray-400 transition text-sm"
          >
            Cenovnik usluga
          </Link>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          {/* Working hours */}
          <WorkingHoursWidget profile={safeProfile} />

          {/* Calendar legend */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4 text-sm">📋 Legenda</h3>
            <ul className="space-y-2.5 text-xs text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded border border-gray-200 bg-white shadow-sm flex-shrink-0" />
                Radno vreme
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded border border-gray-200 bg-[#fffadf] flex-shrink-0" />
                Današnji dan
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded border border-gray-200 bg-[#f3f3f3] flex-shrink-0" />
                Salon ne radi
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-purple-500 flex-shrink-0" />
                Zauzet termin
              </li>
            </ul>
          </div>

          {/* Quick CTA */}
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5">
            <p className="text-sm font-semibold text-purple-800 mb-2">
              Kako zakazati?
            </p>
            <ol className="text-xs text-purple-700 space-y-1.5 mb-4 list-decimal pl-4">
              <li>Registrujte se ili se prijavite</li>
              <li>Kliknite &quot;Zakaži termin&quot;</li>
              <li>Odaberite uslugu i termin</li>
              <li>Potvrdite zakazivanje</li>
            </ol>
            <Link
              href={`/${tenantSlug}/register`}
              className="block text-center py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition"
            >
              Kreiraj nalog →
            </Link>
          </div>
        </aside>

        {/* Calendar */}
        <main className="lg:col-span-3">
          <AppointmentCalendarPage
            initialAppointments={appointments as IAppointment[]}
            salonProfile={safeProfile}
          />
        </main>
      </div>
    </div>
  );
}
