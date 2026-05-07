import Image from "next/image";
import Link from "next/link";

interface Props {
  headline?: string;
  subheadline?: string;
  imageMain?: { src: string; alt?: string };
  cta?: { text: string; href: string };
}

export function Theme4HeroSoft({
  headline,
  subheadline,
  imageMain,
  cta,
}: Props) {
  return (
    <section className="relative w-full h-[100vh] flex items-center">
      <Image
        width={1000}
        height={1000}
        alt={headline || "Hero image"}
        src={
          imageMain
            ? imageMain.src
            : "https://res.cloudinary.com/dufo1t5li/image/upload/v1776724254/image-gen-27-Copy-Copy-Copy-min_s9kqfo.webp"
        }
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 max-w-7xl lg:min-w-7xl mx-auto px-6 text-white">
        <div className="mr-auto">
          <p className="text-xl text-[#E8D4AD] font-meddon mb-2">
            {subheadline}
          </p>

          <h1 className="text-3xl md:text-5xl font-semibold leading-tight max-w-2xl">
            {headline}
          </h1>

          <Link
            href={cta?.href || "/termini"}
            className="bg-[#E8D4AD] text-[#4C2D4A] px-6 py-3 text-sm hover:bg-[#4C2D4A] hover:text-[#E8D4AD] transition mt-6 inline-block"
          >
            {cta?.text}
          </Link>
        </div>
      </div>
    </section>
  );
}
