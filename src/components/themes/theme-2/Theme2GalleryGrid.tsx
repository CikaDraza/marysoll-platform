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
  headline?: string;
  subheadline?: string;
  treatments?: Treatment[];
}

const DEFAULT_TREATMENTS: Treatment[] = [
  {
    id: "makeup-day",
    category: "Makeup",
    title: "Dnevna šminka",
    description:
      "Profesionalna šminka za dnevne svakodnevnice. Koristim profesionalnu kozmetiku renomiranih svetskih brendova.",
    images: [
      {
        src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1770900184/salon/uktpvxy0bc9ijufba9r8.jpg",
        alt: "Dnevna šminka",
      },
      {
        src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1768705206/marysoll-ai-look-1768705168082_xyfogh.jpg",
        alt: "Dnevna azijska šminka",
      },
    ],
    href: "/termini",
  },
  {
    id: "makeup-night",
    category: "Makeup",
    title: "Večernja šminka",
    description:
      "Postojan izgled koji traje celu noć, uz naglašavanje tvojih najlepših crta lica.",
    images: [
      {
        src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1768704883/marysoll-ai-look-1766951292797_plupol.jpg",
        alt: "Večernja šminka",
      },
      {
        src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1768705190/marysoll-ai-look-1768704967165_zwkwim.jpg",
        alt: "Večernja šminka 2",
      },
    ],
    href: "/termini",
  },
];

interface GalleryImageProps {
  img: { src: string; alt: string };
  href: string;
}

function GalleryImage({ img, href }: GalleryImageProps) {
  return (
    <Link href={href} className="group block relative group">
      <Image
        src={img.src}
        alt={img.alt}
        width={380}
        height={380}
        className="w-full rounded-xl object-cover aspect-square transition duration-300 group-hover:opacity-80 transition-transform duration-500 group-hover:scale-110"
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
      className="flex flex-col justify-center p-8 rounded-xl bg-(--secondary-color) shadow-sm hover:shadow-md transition h-full"
    >
      <h3 className="text-xl text-gray-900 font-semibold mb-3">{title}</h3>
      <p className="text-gray-800 leading-relaxed">{description}</p>
    </Link>
  );
}

export function Theme2GalleryGrid({
  treatments,
  instagramUrl,
  instagramTag = "@marysoll_makeup_nails",
  headline,
  subheadline,
}: Props) {
  const finalTreatments =
    treatments && treatments.length > 0 ? treatments : DEFAULT_TREATMENTS;

  return (
    <section className="relative bg-black py-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-baseline items-center justify-between pb-8 lg:pb-3">
          <h2 className="mb-8 lg:mb-0 text-5xl font-semibold tracking-tight text-balance text-white sm:text-6xl">
            {headline || "Kolekcija"}
          </h2>
          <Link href={instagramUrl || "#"}>
            <div className="relative flex items-center group rounded-full shadow-xl shadow-purple-900/30 transition-all duration-300">
              <div className="absolute -ml-8 w-18 h-18 rounded-full flex items-center justify-center text-white transition-all duration-300 bg-[linear-gradient(45deg,#F58529,#DD2A7B,#8134AF,#515BD4)] shadow-[inset_0rem_0.3rem_0.4rem_0_rgb(0,0,0,0.5),inset_0rem_-0.4rem_0.25rem_0_rgb(175,65,240,1)]">
                <InstagramIcon bgColor="white" />
              </div>
              <div className="pl-12 pr-5 h-12 flex items-center rounded-full text-white font-medium transition-all duration-300 bg-[#8134AF] shadow-[inset_0rem_0.3rem_0.4rem_0_rgb(0,0,0,0.5),inset_0rem_-0.4rem_0.25rem_0_rgba(234,179,8,0.15)]">
                {instagramTag || "@shi-sham_haircut_salon"}
              </div>
            </div>
          </Link>
        </div>
        <p className="text-xs lg:w-1/2 text-gray-100 text-center lg:text-left mb-8 lg:mb-12">
          {subheadline ||
            "Pogledajte na instagramu kolekciju naših najlepših radova. Svaki izgled priča svoju priču, a mi smo tu da vaša bude nezaboravna."}
        </p>
        <div className="flex flex-col gap-6">
          {finalTreatments.map((t, i) => {
            const reverse = i % 2 !== 0;
            const image1 = <GalleryImage img={t.images[0]} href={t.href} />;
            const image2 = t.images[1] ? (
              <GalleryImage img={t.images[1]} href={t.href} />
            ) : null;
            const text = (
              <GalleryText
                title={t.title}
                description={t.description}
                href={t.href}
              />
            );

            return (
              <div
                key={t.id ?? i}
                className={`grid grid-cols-1 ${image2 ? "lg:grid-cols-3" : "lg:grid-cols-2"} gap-6`}
              >
                <div className={!reverse ? "lg:order-last" : undefined}>
                  {text}
                </div>
                {image1}
                {image2}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
