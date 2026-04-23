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
        backgroundImage: `url(${data?.imageMain || "https://res.cloudinary.com/dufo1t5li/image/upload/v1776885774/hero-theme-5_iw59uw.png"})`,
      }}
    >
      <div className="max-w-7xl mx-auto px-6 text-white">
        <div className="grid grid-cols-2">
          <div className="col-1" />
          <div className="text-right">
            <h1 className="text-4xl md:text-5xl font-light">
              {data?.headline}
            </h1>

            <p className="mt-4 text-lg opacity-80">{data?.subheadline}</p>

            <a
              href={data?.cta?.href}
              className="inline-block mt-6 border px-6 py-3 text-sm hover:bg-white hover:text-black transition"
            >
              {data?.cta?.text}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
