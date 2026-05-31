import Image from "next/image";
import type { mapCMS } from "@/lib/CMSMapper/mapCMS";
import Link from "next/link";
import InstagramIcon from "@/components/assets/icons/InstagramIcon";

type GalleryData = ReturnType<typeof mapCMS>["gallery"];

export function Theme5Gallery({ data, tenantSlug: _tenantSlug }: { data: GalleryData; tenantSlug?: string }) {
  return (
    <section id="gallery">
      <div className="grid grid-cols-2 md:grid-cols-6">
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
      </div>
      <div className="bg-yellow-500 hover:bg-yellow-600 w-full py-6">
        <Link
          href={data.instagramUrl || "#"}
          className="flex justify-center items-center gap-2 text-white font-medium"
        >
          <InstagramIcon bgColor="white" />
          <span>{data.instagramTag || "@some_insta_salon"}</span>
        </Link>
      </div>
    </section>
  );
}
