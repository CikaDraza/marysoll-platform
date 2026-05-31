import { mapCMS } from "@/lib/CMSMapper/mapCMS";
import Image from "next/image";
import { renderLinkedText } from "@/helpers/renderLinkedText";

type AboutData = ReturnType<typeof mapCMS>["about"];

export function Theme5About({ data, tenantSlug: _tenantSlug }: { data: AboutData; tenantSlug?: string }) {
  return (
    <section className="bg-gradient-to-r from-purple-50 to-purple-100 text-gray-800 py-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1">
          <p className="mb-2 text-[gold] font-meddon text-2xl">story</p>

          <h2 className="text-3xl md:text-4xl mb-6">{data.headline}</h2>

          {data.paragraphs?.map((p, i) => (
            <p className="pb-4 text-gray-800" key={i}>
              {renderLinkedText(p, data.links)}
            </p>
          ))}

          <div className="flex items-center gap-12 mt-10 text-lg">
            {data.stats?.map((s, i) => (
              <div key={i}>
                <div className="text-2xl font-semibold text-[gold]">
                  {s.value}
                </div>
                <div className="opacity-70 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        {data.image?.src && (
          <div className="w-full lg:flex-1 rounded-3xl overflow-hidden shadow-lg">
            <Image
              width={800}
              height={600}
              alt={data.image.alt || "About image"}
              src={data.image.src}
              className="object-cover w-full h-[300px] lg:h-[500px]"
            />
          </div>
        )}
      </div>
    </section>
  );
}
