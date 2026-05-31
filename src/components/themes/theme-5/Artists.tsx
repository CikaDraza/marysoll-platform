import FlowerIcon from "@/components/assets/icons/services/FlowerIcon";
import { LandingStructure } from "@/types";
import Image from "next/image";

interface Props {
  data: LandingStructure["landing"]["artists"];
  tenantSlug?: string;
}
export function Theme5Artists({ data, tenantSlug: _tenantSlug }: Props) {
  return (
    <section className="py-16 bg-white text-center">
      <h2>{data?.headline}</h2>
      <div className="flex mb-10 items-center justify-between w-48 mx-auto">
        <div className="border border-gray-100 w-24"></div>
        <div className="p-2">
          <FlowerIcon bgColor="#FFB633" />
        </div>
        <div className="border border-gray-100 w-24"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 max-w-7xl mx-auto">
        {data?.members?.map((member) => (
          <Image
            width={720}
            height={720}
            key={member.image.src}
            src={member.image.src}
            alt={member.image.alt || data?.headline || "Nasi artisti"}
            className="rounded size-64 object-cover"
          />
        ))}
      </div>
    </section>
  );
}
