import Image from "next/image";

interface Props {
  headline?: string;
  paragraphs?: string[];
  stats?: { value: string; label: string }[];
  imageUrl?: string;
}

export function Theme4AboutSoft({
  headline,
  paragraphs,
  stats,
  imageUrl,
}: Props) {
  return (
    <section className="bg-[#4C2D4A] text-white py-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
        <div>
          <p className="mb-2 text-[#E8D4AD] font-meddon text-2xl">story</p>

          <h2 className="text-3xl md:text-4xl mb-6">{headline}</h2>

          {paragraphs?.map((p, i) => (
            <p className="max-w-xl pb-4 text-gray-100" key={i}>
              {p}
            </p>
          ))}

          <div className="flex items-center gap-12 mt-10 text-lg">
            {stats?.map((s, i) => (
              <div key={i}>
                <div className="text-2xl font-semibold text-[#E8D4AD]">
                  {s.value}
                </div>
                <div className="opacity-70 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <Image
          width={360}
          height={300}
          alt="About us image"
          src={
            imageUrl ||
            "https://res.cloudinary.com/dufo1t5li/image/upload/v1770896288/salon/svgc0l829bx5e62n2xg2.jpg"
          }
          className="rounded-3xl object-cover w-auto h-[300px]"
        />
      </div>
    </section>
  );
}
