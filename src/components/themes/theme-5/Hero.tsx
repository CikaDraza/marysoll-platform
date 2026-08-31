import { BookingCtaLink } from "../shared/BookingCtaLink";
import { resolveThemeHref } from "../shared/themeHref";

interface Props {
  data: {
    headline?: string;
    subheadline?: string;
    imageMain?: { src: string; alt?: string };
    cta?: { text: string; href: string };
  };
  tenantSlug?: string;
}

export function Theme5Hero({ data, tenantSlug }: Props) {
  const base = tenantSlug ? `/${tenantSlug}` : "";
  return (
    <section
      className="relative h-screen bg-cover bg-center flex items-center"
      style={{
        backgroundImage: `url(${data?.imageMain ? data.imageMain.src : "https://res.cloudinary.com/dufo1t5li/image/upload/v1776998286/Gemini_Generated_Image_1esyb51esyb51esy_xvisox.png"})`,
      }}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative max-w-7xl mx-auto px-6 text-white">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="text-left">
            <h1 className="text-4xl md:text-7xl font-black">
              {data?.headline}
            </h1>

            <p className="mt-4 text-lg opacity-80">{data?.subheadline}</p>

            <BookingCtaLink
              href={resolveThemeHref(data?.cta?.href || "termini", base)}
              className="inline-block mt-6 bg-yellow-500 text-black px-8 py-4 text-md font-black hover:bg-white hover:text-black transition"
            >
              {data?.cta?.text}
            </BookingCtaLink>
          </div>
          <div className="col-1" />
        </div>
      </div>
    </section>
  );
}
