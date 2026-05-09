interface FeatureItem {
  title: string;
  description: string;
  icon?: string;
  image?: string;
  link?: string;
}

interface Props {
  headline?: string;
  subheadline?: string;
  items?: FeatureItem[];
}

export function Theme6FeatureCards({
  headline = "Why Choose Us",
  subheadline = "Experience the difference of premium beauty care",
  items = [
    { title: "Years of Experience", description: "Over a decade of mastering the art of beauty and elegance", icon: "✦" },
    { title: "Premium Products", description: "Only the finest, salon-grade products for lasting results", icon: "◆" },
    { title: "Expert Masters", description: "Certified professionals passionate about their craft", image: "" },
    { title: "Hygiene First", description: "Hospital-grade sterilization for your peace of mind", icon: "✧" },
    { title: "Personal Touch", description: "Tailored services designed around your unique style", icon: "◇" },
  ],
}: Props) {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-b from-[#FAF8F5] to-[var(--background)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-16 lg:mb-20">
          <h2 className="text-4xl lg:text-5xl font-light text-[var(--foreground)] mb-4">{headline}</h2>
          <p className="text-lg font-light text-[var(--muted)] max-w-2xl mx-auto">{subheadline}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 lg:gap-8">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="group bg-white border border-[var(--border)] p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="mb-6">
                {item.image ? (
                  <div className="aspect-square overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center text-3xl text-[var(--primary)]">
                    {item.icon || "◆"}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-light text-[var(--foreground)]">{item.title}</h3>
                <p className="text-sm font-light text-[var(--muted)] leading-relaxed">{item.description}</p>
                {item.link && (
                  <a
                    href={item.link}
                    className="inline-flex items-center gap-2 text-xs tracking-wide uppercase text-[var(--foreground)] hover:text-[var(--primary)] transition-colors mt-4"
                  >
                    Learn More
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
