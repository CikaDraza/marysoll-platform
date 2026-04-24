import Link from "next/link";

interface Props {
  data: {
    headline?: string;
    subheadline?: string;
    imageMain?: { src: string; alt?: string };
    cta?: { text: string; href: string };
  };
}

export function Theme5Hero({ data }: Props) {
  return (
    <section
      className="h-screen bg-cover bg-center flex items-center"
      style={{
        backgroundImage: `url(${data?.imageMain || "https://res.cloudinary.com/dufo1t5li/image/upload/v1776998286/Gemini_Generated_Image_1esyb51esyb51esy_xvisox.png"})`,
      }}
    >
      <div className="max-w-7xl mx-auto px-6 text-white">
        <div className="grid grid-cols-2">
          <div className="text-left">
            <h1 className="text-4xl md:text-7xl font-black">
              {data?.headline}
            </h1>

            <p className="mt-4 text-lg opacity-80">{data?.subheadline}</p>

            <Link
              href={data?.cta?.href || "/"}
              className="inline-block mt-6 border px-8 py-4 text-md font-black hover:bg-white hover:text-black transition"
            >
              {data?.cta?.text}
            </Link>
          </div>
          <div className="col-1" />
        </div>
      </div>
    </section>
  );
}
