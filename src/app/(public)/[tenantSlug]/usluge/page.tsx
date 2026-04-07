/**
 * /[tenantSlug]/usluge — Public services page.
 *
 * Server Component — fetches data server-side.
 * Fully public — no auth required.
 * Displays all services with categories, prices, and descriptions.
 */
import { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
// import { CheckIcon } from "@heroicons/react/20/solid";
import {
  fetchPublicSalonProfile,
  fetchPublicServices,
} from "@/lib/tenant/fetchTenantData";
// import { formatPriceToString } from "@/helpers/formatPrice";
// import type { IService } from "@/types";
import ServicesLayout from "./ServiceLayout";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenantSlug } = await params;
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

// function ServiceCard({ service, base }: { service: IService; base: string }) {
//   const dark = service.featured === "main";

//   return (
//     <div
//       className={`rounded-3xl p-7 border ${
//         dark
//           ? "bg-gray-900 text-gray-100 ring-1 ring-gray-700 shadow-2xl"
//           : "bg-white ring-1 ring-gray-200 hover:ring-purple-300 transition-shadow hover:shadow-md"
//       }`}
//     >
//       <div className="flex items-start justify-between gap-2 mb-2">
//         <h3
//           className={`font-semibold text-base ${dark ? "text-purple-400" : "text-purple-700"}`}
//         >
//           {service.name}
//         </h3>
//         {service.featured && service.featured !== "none" && (
//           <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
//             ★ Istaknuto
//           </span>
//         )}
//       </div>

//       <p className={`text-xs mb-4 ${dark ? "text-gray-500" : "text-gray-400"}`}>
//         {service.category}
//         {service.subcategory ? ` · ${service.subcategory}` : ""}
//       </p>

//       {/* Price */}
//       {service.type !== "variant" && service.basePrice != null && (
//         <p className="mb-3">
//           <span
//             className={`text-3xl font-bold ${dark ? "text-white" : "text-gray-900"}`}
//           >
//             {formatPriceToString(service.basePrice)}
//           </span>
//           <span
//             className={`text-sm ml-1 ${dark ? "text-gray-400" : "text-gray-500"}`}
//           >
//             RSD/terminu
//           </span>
//         </p>
//       )}

//       {service.duration && (
//         <p
//           className={`text-xs mb-3 ${dark ? "text-gray-400" : "text-gray-500"}`}
//         >
//           ⏱ {service.duration} min
//         </p>
//       )}

//       {/* Variants */}
//       {service.type === "variant" &&
//         service.variants &&
//         service.variants.length > 0 && (
//           <ul className="space-y-1.5 mb-4">
//             {service.variants.map((v, i) => (
//               <li key={i} className="flex justify-between text-sm">
//                 <span className={dark ? "text-gray-300" : "text-gray-600"}>
//                   {v.name}
//                 </span>
//                 <span
//                   className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}
//                 >
//                   {formatPriceToString(v.price)} RSD
//                 </span>
//               </li>
//             ))}
//           </ul>
//         )}

//       {/* Description */}
//       {service.description && (
//         <p
//           className={`text-xs leading-relaxed mb-4 ${dark ? "text-gray-400" : "text-gray-500"}`}
//         >
//           {service.description}
//         </p>
//       )}

//       {/* Items checklist */}
//       {(service.items?.length ?? 0) > 0 && (
//         <ul className="space-y-1.5 mb-4">
//           {service.items.map((item) => (
//             <li key={item} className="flex gap-2 text-xs">
//               <CheckIcon
//                 className={`h-4 w-4 flex-shrink-0 ${dark ? "text-purple-400" : "text-purple-500"}`}
//               />
//               <span className={dark ? "text-gray-300" : "text-gray-600"}>
//                 {item}
//               </span>
//             </li>
//           ))}
//         </ul>
//       )}

//       <Link
//         href={`${base}/termini`}
//         className={`mt-auto block text-center py-2.5 rounded-xl text-sm font-semibold transition ${
//           dark
//             ? "bg-purple-600 text-white hover:bg-purple-500"
//             : "border border-purple-500 text-purple-600 hover:bg-purple-50"
//         }`}
//       >
//         Pogledaj termine →
//       </Link>
//     </div>
//   );
// }

export default async function UslugePage({ params }: Props) {
  const { tenantSlug } = await params;

  const headersList = await headers();
  const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
  const host = headersList.get("host")?.split(":")[0] ?? "";
  const onCustomDomain =
    host !== "localhost" &&
    !host.startsWith("127.") &&
    !host.endsWith(BASE_DOMAIN) &&
    host !== BASE_DOMAIN;
  const base = onCustomDomain ? "" : `/${tenantSlug}`;

  const [profile, services] = await Promise.all([
    fetchPublicSalonProfile(tenantSlug),
    fetchPublicServices(tenantSlug),
  ]);

  const salonName = profile?.name ?? "Salon";

  // Group by category
  // const grouped = services.reduce<Record<string, IService[]>>((acc, s) => {
  //   const cat = s.category || "Ostalo";
  //   if (!acc[cat]) acc[cat] = [];
  //   acc[cat].push(s);
  //   return acc;
  // }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Services by category */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <ServicesLayout services={services} />
      </section>

      <section className="bg-white border-b border-gray-100 py-20 px-6 text-center">
        {services.length === 0 && (
          <p className="text-center bg-white text-gray-500 text-md py-12">
            Usluge još uvek nisu dodate.
          </p>
        )}
      </section>

      {/* CTA */}
      <section className="bg-purple-600 py-20 px-6 text-center">
        <p className="text-purple-100 text-xs font-bold tracking-[0.25em] uppercase mb-3">
          {salonName}
        </p>
        <h2 className="text-3xl font-bold text-white mb-4">
          Spremi za zakazivanje?
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
  );
}
