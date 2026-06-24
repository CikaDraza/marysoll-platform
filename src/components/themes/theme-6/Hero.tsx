import Image from "next/image";
import { AnchorLink } from "../shared/AnchorLink";

interface Props {
  headline?: string;
  subheadline?: string;
  imageUrl?: string;
  cta?: { label: string; href: string };
  salonName?: string;
  salonDescription?: string;
}

export function Theme6Hero({
  headline = "Make Your Nails Look Gorgeous",
  subheadline,
  imageUrl,
  cta = { label: "Book Appointment", href: "#booking" },
  salonName = "Premium Beauty Studio",
  salonDescription = "Experience luxury nail care with our expert artisans. Premium services, stunning results, unforgettable experience.",
}: Props) {
  const finalSubheadline = subheadline || salonDescription;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#FAF8F5] to-[#F5F1EB]">
      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-8 lg:pr-8">
            <div className="space-y-6">
              <p className="text-xs tracking-[0.2em] uppercase text-[#6B6560] font-light">
                {salonName}
              </p>
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-light leading-[1.1] text-[#2A2825]">
                {headline}
              </h1>
              <p className="text-lg lg:text-xl font-light text-[#6B6560] leading-relaxed max-w-xl">
                {finalSubheadline}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <AnchorLink
                href={cta.href}
                offset={90}
                className="px-8 py-4 bg-[#2A2825] text-white text-sm tracking-wide font-light hover:opacity-90 transition-all hover:scale-105"
              >
                {cta.label}
              </AnchorLink>
              <AnchorLink
                href="#services"
                offset={90}
                className="text-sm tracking-wide font-light text-[#2A2825] hover:text-[#C4A595] transition-colors underline underline-offset-4"
              >
                View Services
              </AnchorLink>
            </div>
          </div>

          <div className="absolute bottom-0 right-0 lg:ml-auto">
            <div className="relative w-full h-full">
              <div className="aspect-[16/9] overflow-hidden">
                {imageUrl ? (
                  <Image
                    width={720}
                    height={720}
                    src={
                      imageUrl ||
                      "https://res.cloudinary.com/dufo1t5li/image/upload/v1778346734/salons/salon-kiki-kiss-beauty/landing/apqpmsnmgue7xcg9nozq.png"
                    }
                    alt="Hero"
                    className="w-[960px] h-[542px] object-cover hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#E8D5C4] to-[#D4B5A0] flex items-center justify-center">
                    <span className="text-[#6B6560] text-sm font-mono">
                      [Hero Image]
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#C4A595] opacity-10 -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
