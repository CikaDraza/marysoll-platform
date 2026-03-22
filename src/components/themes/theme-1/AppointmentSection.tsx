import Link from "next/link";

interface Props { salonName?: string }

export function Theme1AppointmentSection({ salonName }: Props) {
  return (
    <section className="py-16 lg:py-24 bg-(--primary-color) text-white text-center">
      <h2 className="text-3xl lg:text-4xl font-bold mb-4">Zakažite termin u {salonName ?? "našem salonu"}</h2>
      <p className="text-white/80 text-sm mb-8 max-w-md mx-auto">Jednostavno i brzo online zakazivanje. Izaberite uslugu, datum i vreme koji vam odgovara.</p>
      <Link href="/termini" className="inline-block px-10 py-4 bg-white text-(--primary-color) font-bold rounded-full hover:bg-gray-100 transition shadow-xl text-sm">
        Zakaži odmah →
      </Link>
    </section>
  );
}
