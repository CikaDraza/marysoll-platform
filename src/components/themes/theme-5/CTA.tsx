import type { mapCMS } from "@/lib/CMSMapper/mapCMS";

type CTAData = ReturnType<typeof mapCMS>["cta"];

export function Theme5CTA({ data }: { data: CTAData }) {
  return (
    <section
      className="py-20 bg-cover text-white text-center"
      style={{ backgroundImage: `url(${data?.image})` }}
    >
      <h2 className="text-3xl">{data?.headline}</h2>

      <a className="mt-6 inline-block border px-6 py-3">{data?.cta?.label}</a>
    </section>
  );
}
