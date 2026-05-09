import type { mapCMS } from "@/lib/CMSMapper/mapCMS";
import Image from "next/image";
import Link from "next/link";

type CTAData = ReturnType<typeof mapCMS>["cta"];

export function Theme5CTA({ data }: { data: CTAData }) {
  return (
    <section className="relative py-20 min-h-96 text-white text-center">
      <Image
        fill
        alt={data?.headline || "Zakažite odmah"}
        src={data?.image || ""}
        className="absolute inset-0 w-auto h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative min-h-96 flex flex-col items-center justify-center">
        <h2 className="text-3xl">{data?.headline}</h2>

        <Link
          href={`${data?.tenantSlug}/termini`}
          className="mt-6 inline-block border px-6 py-3"
        >
          {data?.cta?.label}
        </Link>
      </div>
    </section>
  );
}
