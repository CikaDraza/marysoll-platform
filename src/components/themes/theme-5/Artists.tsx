import Image from "next/image";

interface Props {
  data: {
    headline?: string;
    images?: { src: string; alt?: string }[];
  };
}

export function Theme5Artists({ data }: Props) {
  return (
    <section className="py-16 bg-white text-center">
      <h3 className="mb-10">{data?.headline}</h3>

      <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {data?.images?.map((a) => (
          <Image
            width={720}
            height={720}
            key={a.src}
            src={a.src}
            alt={a.alt || "Nasi artisti"}
            className="rounded size-64"
          />
        ))}
      </div>
    </section>
  );
}
