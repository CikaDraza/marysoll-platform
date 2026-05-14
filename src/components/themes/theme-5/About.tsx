import { mapCMS } from "@/lib/CMSMapper/mapCMS";
import Image from "next/image";
import { renderLinkedText } from "@/helpers/renderLinkedText";

type AboutData = ReturnType<typeof mapCMS>["about"];

export function Theme5About({ data }: { data: AboutData }) {
  return (
    <section className="relative bg-gradient-to-r from-purple-50 to-purple-100 text-gray-800 py-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
        <div>
          <p className="mb-2 text-[gold] font-meddon text-2xl">story</p>

          <h2 className="text-3xl md:text-4xl mb-6">{data.headline}</h2>

          {data.paragraphs?.map((p, i) => (
            <p className="max-w-xl pb-4 text-gray-800" key={i}>
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
        <div className="hidden lg:block absolute right-0 top-0 h-full w-4xl overflow-hidden">
          <Image
            fill
            alt={data.image.alt || "About image"}
            src={
              data.image.src ||
              "https://res.cloudinary.com/dufo1t5li/image/upload/v1770896288/salon/svgc0l829bx5e62n2xg2.jpg"
            }
            className="object-cover w-auto h-full overflow-visible rounded-3xl shadow-lg"
          />
        </div>
      </div>
    </section>
  );
}
