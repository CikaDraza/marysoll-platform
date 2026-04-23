import { IService } from "@/types";

export function Theme5Pricing({ services }: { services: IService[] }) {
  return (
    <section className="py-16 bg-white text-center">
      <h3 className="text-2xl mb-10">Pricing</h3>

      <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {services?.map((s) => (
          <div key={s._id} className="border p-6">
            <h4>{s.name}</h4>
            <p className="text-lg font-bold mt-2">
              {s.price != null ? `${s.price}€` : "—"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
