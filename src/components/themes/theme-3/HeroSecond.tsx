import Link from "next/link";

interface Props { salonName?: string; description?: string }

export function Theme3HeroSecond({ salonName, description }: Props) {
  const features = ["Profesionalni tretmani", "Vidljivi rezultati", "Opuštajuća atmosfera", "Online zakazivanje"];
  return (
    <section className="bg-white py-20 lg:py-28 px-6">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
        <div className="flex-1 grid grid-cols-2 gap-4">
          {features.map((f, i) => (
            <div key={f} className={`rounded-3xl p-6 ${i === 0 ? "bg-[#C9A990]" : i === 1 ? "bg-[#EDE5DC]" : i === 2 ? "bg-[#F5EEE8]" : "bg-[#DDD5CE]"}`}>
              <p className={`text-sm font-medium ${i === 0 ? "text-white" : "text-[#5C4033]"}`}>{f}</p>
            </div>
          ))}
        </div>
        <div className="flex-1">
          <h2 className="text-3xl lg:text-4xl font-light text-[#3D2B1F] mb-6">
            Tretmani prilagođeni <em className="italic text-[#C9A990] not-italic">vama</em>
          </h2>
          <p className="text-[#9E7E6E] text-sm leading-relaxed mb-8">
            {description ?? "Svaki tretman osmišljen je da donese vidljive promene i osećaj blagostanja. Jer vi zaslužujete samo najbolje."}
          </p>
          <Link href="/usluge" className="inline-block px-7 py-3 bg-[#C9A990] text-white text-sm font-medium rounded-full hover:bg-[#B8957A] transition">
            Pogledaj usluge
          </Link>
        </div>
      </div>
    </section>
  );
}
