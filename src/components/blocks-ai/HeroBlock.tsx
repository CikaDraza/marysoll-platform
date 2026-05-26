import Image from "next/image";
import Link from "next/link";
import { HeroBlock as HeroBlockType } from "@/types/landing-blocks";

interface HeroBlockProps {
  block: HeroBlockType;
}

const galleryLayouts = {
  1: {
    wrapper: "lg:block",
    images: ["aspect-4/5 lg:aspect-[3/1]"],
  },
  2: {
    wrapper: "grid grid-cols-2 gap-8",
    images: ["aspect-4/5 lg:aspect-[3/4]", "aspect-4/5 lg:aspect-[3/4]"],
  },
  3: {
    wrapper: "grid grid-cols-2 grid-rows-2 gap-8",
    images: [
      "col-start-1 row-start-1 row-span-2 aspect-[3/4]",
      "col-start-2 row-start-1 aspect-[3/2]",
      "col-start-2 row-start-2 aspect-[3/2]",
    ],
  },
  4: {
    wrapper:
      "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:h-[clamp(520px,55vw,760px)] lg:grid-cols-3 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch lg:gap-8",
    images: [
      "aspect-4/5 lg:row-span-2 lg:h-full lg:aspect-auto",
      "aspect-[3/2] lg:col-start-2 lg:row-start-1 lg:h-full lg:aspect-auto",
      "aspect-[3/2] lg:col-start-2 lg:row-start-2 lg:h-full lg:aspect-auto",
      "aspect-4/5 sm:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:row-span-2 lg:h-full lg:aspect-auto",
    ],
  },
};

export default function HeroBlock({ block }: HeroBlockProps) {
  const { id, title, subtitle, ctaLabel, href, images = [] } = block;
  const galleryImages = images.slice(0, 4);
  const galleryLayout =
    galleryLayouts[galleryImages.length as keyof typeof galleryLayouts] ??
    galleryLayouts[1];

  return (
    <section
      id={id}
      className="relative overflow-visible px-6 py-16 text-left text-gray-950 dark:bg-gray-950 dark:text-white sm:py-24 lg:px-8"
    >
      {galleryImages.length > 0 && (
        <div
          className={`mx-auto mt-6 max-w-2xl sm:px-6 lg:max-w-7xl lg:px-8 ${galleryLayout.wrapper}`}
        >
          {galleryImages.map((image, index) => (
            <figure key={image.src} className={galleryLayout.images[index]}>
              <Image
                width={1200}
                height={800}
                alt={image.alt}
                src={image.src}
                className="size-full object-cover sm:rounded-lg"
              />
            </figure>
          ))}
        </div>
      )}
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center mt-16 lg:mt-24">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              {subtitle}
            </p>
          )}

          {ctaLabel && href && (
            <div className="mt-8">
              <Link
                href={href}
                className="inline-flex rounded-full bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
              >
                {ctaLabel}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
