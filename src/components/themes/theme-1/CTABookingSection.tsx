import Link from "next/link";

interface Props {
  salonName?: string;
  tenantSlug?: string;
}

export function Theme1CTABookingSection({ salonName, tenantSlug }: Props) {
  const servicesHref = tenantSlug ? `/${tenantSlug}/termini` : "/termini";
  return (
    <section className="py-16 lg:py-24 bg-(--secondary-color) py-20 px-6 text-center">
      <h2 className="text-white text-3xl lg:text-4xl font-bold mb-4">
        Rezerviši termin za 30 sekundi.
      </h2>
      <p className="text-white/80 text-sm mb-8 max-w-md mx-auto">
        Jednostavno i brzo online zakazivanje. Izaberite uslugu, datum i vreme
        koji vam odgovara. {salonName ?? ""}
      </p>
      <Link
        href={servicesHref}
        className="inline-block px-10 py-4 bg-white text-(--primary-color) font-bold rounded-full hover:bg-gray-100 transition shadow-xl text-sm"
      >
        Zakaži odmah →
      </Link>
    </section>
  );
}
