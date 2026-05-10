import Image from "next/image";

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
        <div className="max-w-7xl flex flex-col lg:flex-row mx-auto text-center lg:text-left mb-16 lg:mb-24">
          <h2 className="text-4xl flex-1 lg:text-5xl font-light leading-tight text-[var(--foreground)] whitespace-pre-line mb-8">
            {!headline ||
              "Oslobađanje kreativnosti Utočište za umetnost noktiju"}
          </h2>
          <div className="space-y-6 flex-1">
            {paragraphs.map((paragraph, idx) => (
              <p
                key={idx}
                className="text-base lg:text-lg font-light text-[var(--muted)] leading-relaxed"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-3 lg:gap-8 h-full">
          <div className="md:col-span-2">
            <div className="relative overflow-hidden">
              {images[0]?.src ? (
                <Image
                  src={
                    images[0].src ||
                    "https://res.cloudinary.com/dufo1t5li/image/upload/v1778346734/salons/salon-kiki-kiss-beauty/landing/apqpmsnmgue7xcg9nozq.png"
                  }
                  alt={images[0].alt || "Editorial"}
                  width={720}
                  height={720}
                  className="w-auto h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <Image
                  src={
                    "https://res.cloudinary.com/dufo1t5li/image/upload/v1768705198/marysoll-ai-look-1768705051924_egovhm.jpg"
                  }
                  alt={"Editorial"}
                  width={720}
                  height={720}
                  className="w-auto h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              )}
            </div>
          </div>

          <div className="md:col-span-2 flex items-center overflow-hidden">
            {images[1]?.src ? (
              <Image
                src={images[1].src}
                alt={images[1].alt || "Editorial"}
                width={720}
                height={720}
                className="w-full h-3/4 object-cover hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <Image
                src={
                  "https://res.cloudinary.com/dufo1t5li/image/upload/v1768704883/marysoll-ai-look-1766951292797_plupol.jpg"
                }
                alt={"Editorial"}
                width={720}
                height={720}
                className="w-full h-3/4 object-cover hover:scale-105 transition-transform duration-700"
              />
            )}
          </div>
          <div className="md:col-span-1 flex items-center overflow-hidden">
            {images[2]?.src ? (
              <Image
                src={images[2].src}
                alt={images[2].alt || "Editorial"}
                width={720}
                height={720}
                className="w-full h-3/4 object-cover hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <Image
                src={
                  "https://res.cloudinary.com/dufo1t5li/image/upload/v1768705190/marysoll-ai-look-1768704967165_zwkwim.jpg"
                }
                alt={"Editorial"}
                width={720}
                height={720}
                className="w-full h-3/4 object-cover hover:scale-105 transition-transform duration-700"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
