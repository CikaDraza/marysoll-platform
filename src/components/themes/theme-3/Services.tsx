import { IService } from "@/types";

interface Props {
  services: IService[];
  headline?: string;
  subheadline?: string;
  tenantSlug?: string;
}

export function Theme3ServicesSoft({
  services,
  headline,
  subheadline,
  tenantSlug,
}: Props) {
  return (
    <section className="bg-[#FAF8F5] py-24">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-4xl font-serif text-[#2B2B2B] mb-12">
          {headline || "Usluge"}
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {services.map((s, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 border border-[#E5E0DA]"
            >
              <h3 className="text-lg font-semibold mb-2 text-[#2B2B2B]">
                {s.name}
              </h3>
              <p className="text-sm text-[#6B6B6B] mb-4">{s.description}</p>
              <span className="text-[#E7B8A4] font-semibold">
                {s.price} RSD
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
