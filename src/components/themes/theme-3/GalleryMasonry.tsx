"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface ImageItem {
  url: string;
  alt: string;
}

interface Props {
  images?: {
    images: ImageItem[];
    title?: string;
  }[];
  headline?: string;
}

export function Theme3GalleryMasonry({ images = [], headline }: Props) {
  const flatImages = images.flatMap((g) => g.images);

  if (!flatImages.length) return null;

  return (
    <section className="py-24 bg-[#FAF8F5]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Title */}
        <h2 className="text-4xl text-center font-semibold text-[#2d2d2d] mb-16">
          {headline || "Naši radovi"}
        </h2>

        {/* Masonry */}
        <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
          {flatImages.map((img, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              className="overflow-hidden rounded-2xl"
            >
              <Image
                width={200}
                height={200}
                src={img.url}
                alt={img.alt}
                className="w-full object-cover"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
