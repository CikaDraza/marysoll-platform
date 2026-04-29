import Image from "next/image";
import Link from "next/link";

interface Props {
  headline?: string;
  cta?: { href: string; text: string };
}

export function Theme4CTA({ headline, cta }: Props) {
  return (
    <section className="relative h-[600px] flex items-center justify-center text-white">
      <Image
        fill
        alt={headline || "Zakažite odmah"}
        src="https://res.cloudinary.com/dufo1t5li/image/upload/v1764565548/samples/ecommerce/analog-classic.jpg"
        className="absolute inset-0 w-auto h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative text-center">
        <span className="italic mb-2 text-xs text-[#E8D4AD]">Vreme je</span>
        <h2 className="text-3xl mb-8">{headline}</h2>

        <Link
          href={cta?.href || "/usluge"}
          className="border px-6 py-3 hover:bg-white hover:text-black transition"
        >
          {cta?.text}
        </Link>
      </div>
    </section>
  );
}
