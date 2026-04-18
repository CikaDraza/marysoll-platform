const TESTIMONIALS = [
  {
    comment:
      "MarySoll mi je pomogao da pronađem savršeni tretman za moju kožu. Rezultati su nevjerojatni!",
    clientName: "Ana K.",
  },
  {
    comment:
      "Nakon što sam koristila preporuke s MarySolla, moja koža nikada nije izgledala bolje. Toplo preporučujem!",
    clientName: "Marko P.",
  },
  {
    comment:
      "Volim kako MarySoll personalizira savjete prema mojim potrebama. Osjećam se kao da imam vlastitog stručnjaka za njegu kože!",
    clientName: "Ivana S.",
  },
  {
    comment:
      "MarySoll mi je uštedio puno vremena i novca. Više ne moram eksperimentirati s proizvodima koji mi ne odgovaraju.",
    clientName: "Luka M.",
  },
];

export function Theme3TestimonialsSoft() {
  return (
    <section className="bg-[#FAF8F5] py-24">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-serif mb-12 text-[#2B2B2B]">
          Iskustva klijenata
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl border border-[#E5E0DA]"
            >
              <p className="text-[#6B6B6B] mb-4">&quot;{t.comment}&quot;</p>
              <p className="font-semibold text-[#2B2B2B]">{t.clientName}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
