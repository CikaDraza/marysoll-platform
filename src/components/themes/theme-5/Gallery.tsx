import Image from "next/image";
import type { mapCMS } from "@/lib/CMSMapper/mapCMS";

type GalleryData = ReturnType<typeof mapCMS>["gallery"];

export function Theme5Gallery({ data }: { data: GalleryData }) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-6">
      {data?.images?.map((img: string, i: number) => (
        <Image
          width={720}
          height={720}
          alt={img}
          key={i}
          src={img}
          className="w-full h-full object-cover"
        />
      ))}
    </section>
  );
}
