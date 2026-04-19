"use client";

import Image from "next/image";
import Link from "next/link";

interface Props {
  headline?: string;
  subheadline?: string;
  imageMain?: string;
  imageGrid?: string[];
  cta?: {
    primary: { text: string; href: string };
    secondary?: { text: string; href: string };
  };
}

const IMAGEGRID = [
  "https://res.cloudinary.com/dufo1t5li/image/upload/v1772071241/salon/h4qlp46szqnkosbnjztp.jpg",
  "https://res.cloudinary.com/dufo1t5li/image/upload/v1772025932/salon/dd8p6j5stlaynb5p83qc.jpg",
  "https://res.cloudinary.com/dufo1t5li/image/upload/v1771740371/marysoll-ai-look-1771740341957_nfxa1m.jpg",
  "https://res.cloudinary.com/dufo1t5li/image/upload/v1770903577/salon/zysz4hhfrghqftptog50.jpg",
];
console.log(IMAGEGRID);

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
              className="px-8 py-3 bg-[#E7B8A4] text-white rounded-full text-sm font-semibold hover:opacity-90"
            >
              {cta?.primary?.text || "Zakaži termin"}
            </Link>

            <Link
              href={cta?.secondary?.href || "/usluge"}
              className="px-8 py-3 border border-[#E7B8A4] text-[#2B2B2B] rounded-full text-sm"
            >
              {cta?.secondary?.text || "Pogledaj usluge"}
            </Link>
          </div>
        </div>

        {/* RIGHT GRID */}
        <div className="grid grid-cols-2 gap-4">
          {IMAGEGRID.map((img, i) => (
            <Image
              width={500}
              height={400}
              alt={subheadline || `Gallery image ${i + 1}`}
              key={i}
              src={img}
              className="rounded-2xl object-cover w-full h-40"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
