"use client";

import Image from "next/image";
import Link from "next/link";

interface Props {
  headline?: string;
  subheadline?: string;
  imageMain?: { src: string; alt?: string };
  imageGrid?: { src: string; alt?: string }[];
  cta?: {
    primary: { text: string; href: string };
    secondary?: { text: string; href: string };
  };
}

const IMAGEGRID = [
  {
    src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1775990094/salons/salon-kiki-kiss/zkp7hdikzj00mibx9rgw.png",
    alt: "Gallery image 1",
  },
  {
    src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1775761713/salons/salon-kiki-kiss/tet7uhkebh4hpaogjmvw.png",
    alt: "Gallery image 2",
  },
  {
    src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1776608764/salons/salon-shi-sham-frizerski-salon/drjn82yvrwhjzbyargei.png",
    alt: "Gallery image 3",
  },
  {
    src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1778233204/salons/salon-beauty-m-glow/landing/lcweiootrnandqwdehm1.jpg",
    alt: "Gallery image 4",
  },
];

export function Theme3HeroSoft({
  headline,
  subheadline,
  imageMain,
  imageGrid,
  cta,
}: Props) {
  return (
    <section className="bg-[#FAF8F5] py-44">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        {/* LEFT TEXT */}
        <div>
          <h1 className="text-5xl lg:text-6xl font-serif text-[#2B2B2B] mb-6 leading-tight">
            {headline || "Otkrij svoju prirodnu lepotu"}
          </h1>

          <p className="text-[#6B6B6B] mb-8 max-w-md">
            {subheadline ||
              "Profesionalna nega i tretmani koji naglašavaju tvoju jedinstvenu lepotu."}
          </p>

          <div className="flex gap-4">
            <Link
              href={cta?.primary?.href || "/termini"}
              className="px-8 py-3 bg-(--primary-color) text-white rounded-full text-sm font-semibold hover:opacity-90"
            >
              {cta?.primary?.text || "Zakaži termin"}
            </Link>

            <Link
              href={cta?.secondary?.href || "/usluge"}
              className="px-8 py-3 border border-(--primary-color) text-[#2B2B2B] rounded-full text-sm"
            >
              {cta?.secondary?.text || "Pogledaj usluge"}
            </Link>
          </div>
        </div>

        {/* RIGHT GRID */}
        <div className="grid grid-cols-2 gap-1">
          {imageMain ? (
            <Image
              width={500}
              height={500}
              alt={imageMain?.alt || subheadline || `Gallery image`}
              src={imageMain?.src}
              className="rounded-2xl object-cover w-full h-auto col-span-2"
            />
          ) : (
            (imageGrid && imageGrid?.length > 0 ? imageGrid : IMAGEGRID).map(
              (img, i) => (
                <Image
                  width={500}
                  height={500}
                  // Access img.alt if it exists, otherwise fallback to the default
                  alt={img?.alt || subheadline || `Gallery image ${i + 1}`}
                  key={i}
                  // Access img.src because 'img' is an object
                  src={img?.src}
                  className="rounded-2xl object-cover w-full h-full"
                />
              ),
            )
          )}
        </div>
      </div>
    </section>
  );
}
