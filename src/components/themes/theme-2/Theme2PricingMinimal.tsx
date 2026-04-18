import { IService } from "@/types";

export function Theme2PricingMinimal({ services }: { services: IService[] }) {
  return (
    <section className="bg-[#0F0F0F] text-white py-24">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-bold mb-12">Cenovnik</h2>

        <div className="divide-y divide-gray-800">
          {services.map((s, i) => (
            <div
              key={i}
              className="flex justify-between items-center gap-4 py-4"
            >
              <span className="text-gray-300">{s.name}</span>
              <hr className="flex-1 border-dashed border-gray-300" />
              <span className="text-yellow-400 font-semibold">
                {s.basePrice} RSD
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
