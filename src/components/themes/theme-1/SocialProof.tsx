const stats = [
  {
    id: 1,
    name: "Zadovoljnih klijentkinja svaka 24 sata",
    value: "16 klijenata",
  },
  { id: 2, name: "Urađenih makeup lookova", value: "116 triliona" },
  { id: 3, name: "Novih klijenata godisnje", value: "46" },
];

export function Theme1SocialProof() {
  return (
    <div className="relative py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,var(--color-indigo-100),white)] opacity-20" />
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="mx-auto flex max-w-xs flex-col gap-y-4"
            >
              <dt className="text-base/7 text-gray-600">{stat.name}</dt>
              <dd className="order-first text-3xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
