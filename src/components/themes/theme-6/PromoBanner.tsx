import Image from "next/image";

interface Props {
  headline?: string;
  subheadline?: string;
  image?: string;
  cta?: { label: string; href: string };
}

export function Theme6PromoBanner({
  headline = "Limited Offer:\nLuxury Color Treatment",
  subheadline = "Experience our signature color treatment with complimentary nail art. Book before the end of the month.",
  image,
  cta = { label: "Claim Offer", href: "#booking" },
}: Props) {
  return (
    <section
      id="booking"
      className="py-20 lg:py-32 bg-gradient-to-br from-[#F5EDE5] to-[#EAE0D5]"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center bg-white overflow-hidden shadow-lg">
          <div className="order-2 lg:order-1">
            <div className="aspect-[4/3] lg:aspect-square overflow-hidden">
              {image ? (
                <Image
                  width={640}
                  height={480}
                  src={image}
                  alt="Promo"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#E8D5C4] to-[#D4B5A0] flex items-center justify-center">
                  <span className="text-[var(--muted)] text-sm font-mono">
                    [Promo Image]
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="order-1 lg:order-2 px-8 lg:px-12 py-12 lg:py-16 space-y-8">
            <div className="space-y-6">
              <p className="text-xs tracking-[0.2em] uppercase text-[var(--primary)] font-light">
                Special Promotion
              </p>
              <h2 className="text-4xl lg:text-5xl font-light leading-tight text-[var(--foreground)] whitespace-pre-line">
                {headline}
              </h2>
              <p className="text-lg font-light text-[var(--muted)] leading-relaxed">
                {subheadline}
              </p>
            </div>
            <a
              href={cta.href}
              className="inline-flex items-center gap-3 px-8 py-4 bg-[var(--foreground)] text-white text-sm tracking-wide font-light hover:opacity-90 transition-all hover:scale-105"
            >
              {cta.label}
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
