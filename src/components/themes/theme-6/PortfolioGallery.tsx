import Image from "next/image";

interface GalleryImage {
  src: string;
  title?: string;
}

interface Props {
  headline?: string;
  subheadline?: string;
  images?: GalleryImage[];
}

export function Theme6PortfolioGallery({
  headline = "Portfolio of Stunning Designs",
  subheadline = "Browse our latest work and get inspired for your next visit",
  images = [
    { src: "", title: "French Tips Elegance" },
    { src: "", title: "Ombre Dreams" },
    { src: "", title: "Floral Artistry" },
    { src: "", title: "Geometric Precision" },
    { src: "", title: "Crystal Accents" },
    { src: "", title: "Marble Effect" },
    { src: "", title: "Nude Sophistication" },
    { src: "", title: "Bold Statement" },
  ],
}: Props) {
  return (
    <section id="gallery" className="py-20 lg:py-32 bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-16 lg:mb-20">
          <h2 className="text-4xl lg:text-5xl font-light text-[var(--foreground)] mb-4">
            {headline}
          </h2>
          <p className="text-lg font-light text-[var(--muted)] max-w-2xl mx-auto">
            {subheadline}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {images.map((item, idx) => (
            <div
              key={idx}
              className="group relative aspect-square bg-white overflow-hidden cursor-pointer"
            >
              {item.src ? (
                <Image
                  width={640}
                  height={640}
                  src={item.src}
                  alt={item.title || `Portfolio ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#E8D5C4] via-[#D4B5A0] to-[#C4A595] flex items-center justify-center">
                  <span className="text-white/80 text-xs font-mono text-center px-4">
                    [{item.title}]
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="text-center text-white space-y-2">
                  {item.title && (
                    <p className="text-sm font-light tracking-wide">
                      {item.title}
                    </p>
                  )}
                  <svg
                    className="w-6 h-6 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
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
