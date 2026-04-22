"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface Props {
  images?: { src: string; alt?: string }[];
  headline?: string;
}

export function Theme3GalleryMasonry({ images, headline }: Props) {
  if (!images || images.length === 0) return null;

  return (
    <section className="py-24 bg-[#FAF8F5]">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-4xl text-center font-semibold text-[#2d2d2d] mb-16">
          {headline || "Naši radovi"}
        </h2>

        <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
          {images.map((img, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              className="overflow-hidden rounded-2xl"
            >
              <Image
                width={500}
                height={400}
                src={img.src}
                alt={img.alt || `Gallery image ${index + 1}`}
                className="w-full object-cover"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
