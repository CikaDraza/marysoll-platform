import Image from "next/image";

interface TestimonialItem {
  name: string;
  text: string;
  image?: string;
}

interface Props {
  headline?: string;
  testimonials?: TestimonialItem[];
}

export function Theme6Testimonials({
  headline = "Our Valuable Customer",
  testimonials = [
    {
      name: "Jessica L.",
      text: "Absolutely stunning work! The attention to detail is incredible. I always leave feeling pampered and beautiful.",
      image: "",
    },
    {
      name: "Rachel M.",
      text: "I have been a loyal client for over three years. The quality is consistently exceptional, and the atmosphere is so relaxing.",
      image: "",
    },
    {
      name: "Michelle W.",
      text: "Best nail salon experience ever. The artists are true professionals who take pride in their craft.",
      image: "",
    },
  ],
}: Props) {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-b from-[#FAF8F5] to-[var(--background)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-16 lg:mb-20">
          <h2 className="text-4xl lg:text-5xl font-light text-[var(--foreground)]">
            {headline}
          </h2>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {testimonials.map((testimonial, idx) => (
            <div
              key={idx}
              className="bg-white border border-[var(--border)] p-8 lg:p-12 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E8D5C4] to-[#D4B5A0] overflow-hidden">
                    {testimonial.image ? (
                      <Image
                        width={640}
                        height={640}
                        src={testimonial.image}
                        alt={testimonial.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xl font-light">
                        {testimonial.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <p className="text-base lg:text-lg font-light text-[var(--muted)] leading-relaxed italic">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  <p className="text-sm font-light text-[var(--foreground)] tracking-wide">
                    — {testimonial.name}
                  </p>
                </div>

                <div className="hidden lg:block flex-shrink-0">
                  <svg
                    className="w-8 h-8 text-[var(--border)]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
