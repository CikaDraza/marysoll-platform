import Link from "next/link";

interface Props { salonName?: string; description?: string }

export function Theme1HeroSecond({ salonName, description }: Props) {
  return (
    <section className="py-12 lg:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl lg:text-6xl font-bold text-(--primary-color) mb-6">{salonName ?? "Beauty Salon"}</h2>
        <p className="text-gray-600 text-sm lg:text-lg max-w-xl mb-8">{description ?? "Profesionalni tretmani za vašu lepotu i opuštanje."}</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/usluge" className="px-7 py-3 bg-(--secondary-color) text-white font-semibold rounded-full hover:bg-(--primary-color) transition text-sm">
            Pogledajte cenovnik
          </Link>
          <Link href="/termini" className="px-7 py-3 border border-(--primary-color) text-(--primary-color) font-semibold rounded-full hover:bg-(--primary-color) hover:text-white transition text-sm">
            Zakazite termin
          </Link>
        </div>
      </div>
    </section>
  );
}
