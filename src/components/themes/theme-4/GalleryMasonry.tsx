"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface Props {
  images?: { src: string; alt?: string }[];
  headline?: string;
}

export function Theme4GalleryMasonry({ images, headline }: Props) {
  if (!images || images.length === 0) return null;

  // Pomoćna funkcija za renderovanje slike sa motion efektom
  const RenderImage = (
    img: { src: string; alt?: string } | undefined,
    index: number,
    customClass: string,
  ) => {
    if (!img) return null;
    return (
      <div className={customClass}>
        <motion.div
          key={index}
          whileHover={{ scale: 1.02 }}
          className="h-full w-full overflow-hidden rounded-2xl"
        >
          <Image
            width={800}
            height={1000}
            src={img.src}
            alt={img.alt || `Gallery image ${index}`}
            className="block h-full w-full object-cover object-center"
          />
        </motion.div>
      </div>
    );
  };

  return (
    <section id="gallery" className="py-24 bg-[#2b1e26]">
      <div className="container mx-auto px-5 lg:px-32">
        <h2 className="text-5xl text-center font-semibold text-white mb-16">
          {headline || "Naši radovi"}
        </h2>

        <div className="-m-1 flex flex-wrap md:-m-2">
          {/* LEVA KOLONA (2 male gore, 1 velika dole) */}
          <div className="flex w-full sm:w-1/2 flex-wrap lg:flex-row flex-row-reverse">
            {RenderImage(images[0], 0, "w-full lg:w-1/2 p-1 md:p-2")}
            {RenderImage(images[1], 1, "w-full lg:w-1/2 p-1 md:p-2")}
            {RenderImage(images[2], 2, "w-full p-1 md:p-2")}
          </div>

          {/* DESNA KOLONA (1 velika gore, 2 male dole) */}
          <div className="flex w-full sm:w-1/2 flex-wrap">
            {RenderImage(images[3], 3, "w-full p-1 md:p-2")}
            {RenderImage(images[4], 4, "w-1/2 p-1 md:p-2")}
            {RenderImage(images[5], 5, "w-1/2 p-1 md:p-2")}
          </div>
        </div>
      </div>
    </section>
  );
}
