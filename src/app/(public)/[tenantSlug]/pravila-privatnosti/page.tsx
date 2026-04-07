/**
 * /[tenantSlug]/pravila-privatnosti — Privacy policy page.
 * Server Component — fetches salon profile to replace hardcoded info.
 */
import { headers } from "next/headers";
import type { Metadata } from "next";
import {
  ArrowPathIcon,
  CloudArrowUpIcon,
  FingerPrintIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { fetchPublicSalonProfile } from "@/lib/tenant/fetchTenantData";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenantSlug } = await params;
  const profile = await fetchPublicSalonProfile(tenantSlug);
  return {
    title: `Politika privatnosti — ${profile?.name ?? "Salon"}`,
  };
}

export default async function PrivacyPolicyPage({ params }: Props) {
  const { tenantSlug } = await params;
  const headersList = await headers();
  const slug = headersList.get("x-tenant-slug") || tenantSlug;

  const profile = await fetchPublicSalonProfile(slug);
  const salonName = profile?.name ?? "Salon";
  const contactEmail = profile?.contactEmail ?? profile?.email ?? "";

  const features = [
    {
      name: "Podaci koje prikupljamo",
      description: `Prikupljamo samo neophodne podatke kako bismo vam pružili najbolje usluge: lično ime, email adresu i broj telefona, podatke o terminima (datum, vreme, vrsta usluge), kao i tehničke podatke — kolačiće koji se koriste isključivo za autentifikaciju i rad aplikacije.`,
      icon: CloudArrowUpIcon,
    },
    {
      name: "Sigurnost podataka",
      description:
        "Primenjujemo stroge mere bezbednosti: SSL šifrovanje za sve prenose podataka, sigurno čuvanje podataka, ograničen pristup podacima samo ovlašćenom osoblju i redovne bezbednosne provere.",
      icon: LockClosedIcon,
    },
    {
      name: "Kako koristimo vaše podatke",
      description:
        "Vaše podatke koristimo isključivo u svrhe zakazivanja i upravljanja terminima, slanja obaveštenja o promenama termina, komunikacije povodom vaših usluga i poboljšanja kvaliteta naših usluga.",
      icon: ArrowPathIcon,
    },
    {
      name: "Deljenje podataka",
      description: `NE delimo vaše lične podatke sa trećim stranama. Vaši podaci ostaju sigurni kod nas i koriste se samo za pružanje usluga salona ${salonName}.`,
      icon: FingerPrintIcon,
    },
  ];

  return (
    <div className="privacy-policy bg-transparent py-24 lg:py-44">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <span className="text-base/7 font-semibold text-(--primary-color)">
            Politika privatnosti — {salonName}
          </span>
          <h1 className="mt-2 text-4xl lg:text-5xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl lg:text-balance">
            Zaštita vaših podataka je naš prioritet
          </h1>
          <p className="mt-6 text-lg/8 text-gray-700">
            U {salonName} cenimo vašu privatnost i posvećeni smo zaštiti ličnih
            podataka koje nam poverite. Ova politika privatnosti objašnjava kako
            prikupljamo, koristimo i štitimo vaše informacije.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-16">
                <dt className="text-base/7 font-semibold text-gray-900">
                  <div className="absolute top-0 left-0 flex size-10 items-center justify-center rounded-lg bg-(--primary-color)">
                    <feature.icon
                      aria-hidden="true"
                      className="size-6 text-white"
                    />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base/7 text-gray-600">
                  {feature.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {contactEmail && (
          <div className="mt-16">
            <h2 className="text-2xl! font-bold tracking-tight text-gray-900">
              Kontakt
            </h2>
            <p className="mt-4 text-lg/8 text-gray-700">
              Za sva pitanja vezana za privatnost podataka kontaktirajte nas na{" "}
              <strong>{contactEmail}</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
