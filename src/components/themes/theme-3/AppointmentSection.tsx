import Link from "next/link";
interface Props { salonName?: string }
export function Theme3AppointmentSection({ salonName }: Props) {
  return (
    <section className="bg-[#C9A990] py-20 px-6 text-center">
      <p className="text-white/70 text-xs font-semibold tracking-[0.25em] uppercase mb-4">rezervacija</p>
      <h2 className="text-3xl font-light text-white mb-4">Zakažite vaš termin</h2>
      <p className="text-white/80 text-sm mb-8 max-w-sm mx-auto">Jednostavno online zakazivanje. Izaberite uslugu i termin koji vam odgovara.</p>
      <Link href="/termini" className="inline-block px-10 py-4 bg-white text-[#C9A990] font-medium text-sm rounded-full hover:bg-[#FAF8F5] transition shadow-lg">
        Zakaži odmah →
      </Link>
    </section>
  );
}
