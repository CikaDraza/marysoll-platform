import Image from "next/image";
import { FadeUp } from "./FadeUp";
import { Theme8TestimonialCarousel } from "./TestimonialCarousel/Theme8TestimonialCarousel";
import type { PublicTestimonial } from "@/types/public-testimonials";

interface Props {
  testimonials?: PublicTestimonial[];
  headline?: string;
  tenantSlug?: string;
  initialHasMore?: boolean;
}

export function Theme8TestimonialsSection({
  testimonials = [],
  headline,
  tenantSlug,
  initialHasMore = false,
}: Props) {
  return (
    <section
      id="reviews"
      className="relative max-w-[1140px] mx-auto my-28 px-5"
    >
      <FadeUp className="text-center mb-10 relative">
        <Image
          src="/images/theme-8/paint-streak.webp"
          alt=""
          aria-hidden="true"
          width={760}
          height={240}
          className="absolute left-1/2 top-[54%] w-[760px] h-auto max-w-[112%] -translate-x-1/2 -translate-y-1/2 scale-105 opacity-90 z-0 pointer-events-none"
        />
        <span className="relative z-[1] inline-block font-extrabold text-[12px] tracking-[0.24em] uppercase text-y2k-pink">
          {headline || "Kind words"}
        </span>
        <h2 className="relative z-[1] -mt-1.5 font-bagel text-[clamp(40px,6vw,80px)] leading-[0.9] text-y2k-ink rotate-[-1deg]">
          LOVED BY THE CHAIR
        </h2>
      </FadeUp>

      <Theme8TestimonialCarousel
        tenantSlug={tenantSlug}
        initialTestimonials={testimonials.slice(0, 3)}
        initialHasMore={initialHasMore}
      />
    </section>
  );
}
