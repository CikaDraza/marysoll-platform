interface EditorialImage {
  src: string;
  alt?: string;
}

interface Props {
  headline?: string;
  paragraphs?: string[];
  images?: EditorialImage[];
}

export function Theme6AboutEditorial({
  headline = "Unleashing Creativity:\nA Nail Art Haven",
  paragraphs = [
    "At our studio, we believe that nails are a canvas for self-expression. Our talented artists combine traditional techniques with modern innovation to create stunning, wearable art.",
    "Every detail matters. From the initial consultation to the final polish, we ensure an experience that is both luxurious and personalized to your unique style.",
  ],
  images = [
    { src: "", alt: "Editorial 1" },
    { src: "", alt: "Editorial 2" },
    { src: "", alt: "Editorial 3" },
  ],
}: Props) {
  return (
    <section className="py-20 lg:py-32 bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mx-auto text-center mb-16 lg:mb-24">
          <h2 className="text-4xl lg:text-5xl font-light leading-tight text-[var(--foreground)] whitespace-pre-line mb-8">
            {headline}
          </h2>
          <div className="space-y-6">
            {paragraphs.map((paragraph, idx) => (
              <p key={idx} className="text-base lg:text-lg font-light text-[var(--muted)] leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          <div className="md:row-span-2">
            <div className="aspect-[3/4] bg-white overflow-hidden">
              {images[0]?.src ? (
                <img
                  src={images[0].src}
                  alt={images[0].alt || "Editorial"}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#E8D5C4] to-[#D4B5A0] flex items-center justify-center">
                  <span className="text-[var(--muted)] text-sm font-mono">[Editorial Image 1]</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="aspect-[4/3] bg-white overflow-hidden">
              {images[1]?.src ? (
                <img
                  src={images[1].src}
                  alt={images[1].alt || "Editorial"}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#D4B5A0] to-[#C4A595] flex items-center justify-center">
                  <span className="text-[var(--muted)] text-sm font-mono">[Editorial Image 2]</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="aspect-[4/3] bg-white overflow-hidden">
              {images[2]?.src ? (
                <img
                  src={images[2].src}
                  alt={images[2].alt || "Editorial"}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#C4A595] to-[#B5988A] flex items-center justify-center">
                  <span className="text-[var(--muted)] text-sm font-mono">[Editorial Image 3]</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
