import Image from "next/image";
import { renderLinkedText } from "@/helpers/renderLinkedText";
import { AboutTextLink } from "@/types";

interface Stat {
  value: string;
  label: string;
}

interface Props {
  about: {
    headline?: string;
    paragraphs?: string[];
    links?: AboutTextLink[];
    image?: {
      src: string;
      alt?: string;
    };
    stats?: Stat[];
  };
}

export function Theme3AboutSoft({ about }: Props) {
  return (
    <section className="bg-[#F3EFEA] py-24">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <Image
          width={600}
          height={500}
          alt={about.image?.alt || "About us image"}
          src={
            about.image?.src ||
            "https://res.cloudinary.com/dufo1t5li/image/upload/v1775758480/salons/salon-kiki-kiss/xvxnmkwisrocqnia1gcm.png"
          }
          className="rounded-3xl object-cover w-auto h-[500px]"
        />

        <div>
          <h2 className="text-4xl font-serif text-[#2B2B2B] mb-6">
            {about.headline || "O nama"}
          </h2>

          <div className="flex flex-col gap-3">
            <p className="text-[#6B6B6B] leading-relaxed">
              {renderLinkedText(
                about.paragraphs?.[0] ||
                  "Naš salon pruža nežnu i profesionalnu negu uz pažnju prema svakom detalju.",
                about.links,
              )}
            </p>
            <p className="text-[#6B6B6B] leading-relaxed">
              {renderLinkedText(
                about.paragraphs?.[1] ||
                  "Naš salon pruža nežnu i profesionalnu negu uz pažnju prema svakom detalju.",
                about.links,
              )}
            </p>
            <p className="text-[#6B6B6B] leading-relaxed">
              {renderLinkedText(
                about.paragraphs?.[2] ||
                  "Naš salon pruža nežnu i profesionalnu negu uz pažnju prema svakom detalju.",
                about.links,
              )}
            </p>
          </div>
          {about.stats && about.stats.length > 0 && (
            <div className="flex gap-10 mt-8">
              {about.stats.map((s, i) => (
                <div key={i}>
                  <div className="text-2xl font-semibold text-(--primary-color)">{s.value}</div>
                  <div className="text-sm text-[#6B6B6B] mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
