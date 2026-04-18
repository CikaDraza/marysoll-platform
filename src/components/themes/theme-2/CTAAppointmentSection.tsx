import Link from "next/link";
interface Props {
  salonName?: string;
}
export function Theme2CTAAppointmentSection({ salonName }: Props) {
  return (
    <section className="bg-yellow-500 py-24 px-6 text-center">
      <h2 className="text-3xl lg:text-4xl font-black text-gray-950 mb-4">
        {salonName ?? "Zakažite termin"}
      </h2>
      <p className="text-gray-800 text-sm mb-8 max-w-md mx-auto">
        Online zakazivanje dostupno 24/7. Izaberite uslugu, datum i vreme.
      </p>
      <Link
        href="/termini"
        className="inline-block px-12 py-4 bg-gray-950 text-yellow-400 font-black text-sm tracking-widest rounded hover:bg-gray-800 transition shadow-2xl"
      >
        ZAKAŽI ODMAH
      </Link>
    </section>
  );
}
