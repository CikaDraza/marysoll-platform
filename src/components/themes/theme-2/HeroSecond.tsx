import Link from "next/link";

interface Props { salonName?: string }

export function Theme2HeroSecond({ salonName }: Props) {
  const features = ["Profesionalna oprema", "Vidljivi rezultati", "Individualni pristup", "Online zakazivanje"];
  return (
    <section className="bg-gray-900 py-24 px-6">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1">
          <div className="w-12 h-0.5 bg-yellow-500 mb-6" />
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 leading-tight">
            Tretmani koji daju <span className="text-yellow-400">rezultate</span>
          </h2>
          <p className="text-gray-400 text-base leading-relaxed mb-8">
            Naš salon nudi premium usluge prilagođene vašim potrebama. Svaki tretman osmišljen je da donese vidljive promene.
          </p>
          <Link href="/usluge" className="inline-block px-7 py-3 bg-yellow-500 text-gray-950 font-black text-sm rounded hover:bg-yellow-400 transition">
            Pogledaj usluge
          </Link>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4">
          {features.map((f, i) => (
            <div key={f} className={`rounded-xl p-5 border ${i === 0 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-gray-800 border-gray-700"}`}>
              <div className="w-6 h-0.5 bg-yellow-500 mb-3" />
              <p className={`text-sm font-semibold ${i === 0 ? "text-yellow-400" : "text-gray-200"}`}>{f}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
