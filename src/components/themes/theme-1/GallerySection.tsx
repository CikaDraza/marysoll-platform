import InstagramIcon from "@/components/assets/icons/InstagramIcon copy";
import Image from "next/image";
import Link from "next/link";

type Treatment = {
  id: string;
  category: string;
  title: string;
  description: string;
  images: { src: string; alt: string }[];
  href: string;
};

interface Props {
  instagramUrl: string;
  instagramTag: string;
  treatments: Treatment[];
}

interface GalleryImageProps {
  img: { src: string; alt: string };
  href: string;
}

function GalleryImage({ img, href }: GalleryImageProps) {
  return (
    <Link href={href} className="group block relative">
      <Image
        src={img.src}
        alt={img.alt}
        width={380}
        height={380}
        className="w-full rounded-xl object-cover aspect-square
        transition duration-300 group-hover:opacity-80"
      />
    </Link>
  );
}

interface GalleryTextProps {
  title: string;
  description: string;
  href: string;
}

function GalleryText({ title, description, href }: GalleryTextProps) {
  return (
    <Link
      href={href}
      className="
      flex flex-col justify-center
      p-8
      rounded-xl
      bg-white
      shadow-sm
      hover:shadow-md
      transition
      h-full"
    >
      <h3 className="text-xl text-gray-700 font-semibold mb-3">{title}</h3>

      <p className="text-gray-600 leading-relaxed">{description}</p>
    </Link>
  );
}

export function Theme1GallerySection({
  treatments,
  instagramUrl,
  instagramTag = "@marysoll_makeup_nails",
}: Props) {
  return (
    <section className="relative py-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,var(--color-indigo-100),white)] opacity-20" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-baseline justify-between pt-24 mb-6">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900">
            Kolekcija
          </h2>
          <Link href={instagramUrl}>
            <div className="relative flex items-center group shadow-xl shadow-purple-900/30 rounded-full">
              <div
                className="absolute -ml-8 w-18 h-18 shadow-[inset_0rem_0.3rem_0.4rem_0_rgb(0,0,0,0.5),inset_0rem_-0.4rem_0.25rem_0_rgb(175,65,240,1)] rounded-full flex items-center justify-center text-white"
                style={{
                  background:
                    "linear-gradient(45deg,#F58529,#DD2A7B,#8134AF,#515BD4)",
                }}
              >
                <InstagramIcon bgColor="white" />
              </div>

              <div
                className="pl-12 pr-5 h-12 flex items-center rounded-full text-white font-medium shadow-[inset_0rem_0.3rem_0.4rem_0_rgb(0,0,0,0.5),inset_0rem_-0.4rem_0.25rem_0_rgb(175,65,240,1)]"
                style={{
                  background: "#8134AF",
                }}
              >
                {instagramTag ? instagramTag : "@marysoll_makeup_nails"}
              </div>
            </div>
          </Link>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          {treatments.map((t, i) => {
            const reverse = i % 2 !== 0;

            const image1 = <GalleryImage img={t.images[0]} href={t.href} />;

            const image2 = <GalleryImage img={t.images[1]} href={t.href} />;

            const text = (
              <GalleryText
                title={t.title}
                description={t.description}
                href={t.href}
              />
            );

            return (
              <>
                {reverse ? (
                  <>
                    {text}
                    {image1}
                    {image2}
                  </>
                ) : (
                  <>
                    {image1}
                    {image2}
                    {text}
                  </>
                )}
              </>
            );
          })}
        </div>
      </div>
    </section>
  );
}
