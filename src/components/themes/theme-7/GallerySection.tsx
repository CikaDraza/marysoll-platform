import Image from "next/image";
import Link from "next/link";
import { FadeUp } from "./FadeUp";

type Treatment = {
  id: string;
  category: string;
  title: string;
  description: string;
  images: { src: string; alt: string }[];
  href: string;
};

interface Props {
  treatments?: Treatment[];
  headline?: string;
  tenantSlug?: string;
}

const DEFAULT_TREATMENTS: Treatment[] = [
  {
    id: "classic",
    category: "Category",
    title: "Classic Set",
    description:
      "One extension per natural lash for soft, weightless definition — your eyes, only more awake.",
    images: [
      { src: "/images/theme-7/lash-classic.webp", alt: "Classic lash set" },
      { src: "/images/theme-7/lash-classic.webp", alt: "Classic lash detail" },
    ],
    href: "/termini",
  },
  {
    id: "hybrid",
    category: "Category",
    title: "Hybrid / Cat Eye",
    description:
      "Classic and volume blended, elongated outward for a lifted, feline shape that flatters every eye.",
    images: [
      { src: "/images/theme-7/lash-hybrid.webp", alt: "Hybrid cat-eye lashes" },
      { src: "/images/theme-7/lash-hybrid.webp", alt: "Hybrid lash detail" },
    ],
    href: "/termini",
  },
  {
    id: "deepbrown",
    category: "Category",
    title: "Deep Brown Set",
    description:
      "Warm brown lashes for a softer, sun-kissed take on volume — bold without the contrast of black.",
    images: [
      { src: "/images/theme-7/lash-deepbrown.webp", alt: "Deep brown lash set" },
      {
        src: "/images/theme-7/lash-deepbrown.webp",
        alt: "Deep brown lash detail",
      },
    ],
    href: "/termini",
  },
];

function GalleryImage({
  img,
  detail = false,
}: {
  img: { src: string; alt: string };
  detail?: boolean;
}) {
  if (!img?.src) return null;
  return (
    <div className="group relative overflow-hidden rounded-[20px] aspect-[3/4] ring-1 ring-black/5">
      <Image
        src={img.src}
        alt={img.alt}
        width={520}
        height={693}
        className={`w-full h-full object-cover transition-transform duration-[1.2s] ${
          detail
            ? "object-[55%_25%] scale-[1.5] group-hover:scale-[1.6]"
            : "group-hover:scale-105"
        }`}
      />
    </div>
  );
}

export function Theme7GallerySection({
  treatments,
  headline,
  tenantSlug,
}: Props) {
  const base = tenantSlug ? `/${tenantSlug}` : "";
  const resolveHref = (href: string) => {
    if (!href) return `${base}/termini`;
    if (/^https?:\/\//.test(href)) return href;
    return href.startsWith("/") ? `${base}${href}` : `${base}/${href}`;
  };

  const rows =
    treatments && treatments.length > 0 ? treatments : DEFAULT_TREATMENTS;

  return (
    <section id="gallery" className="bg-cream/60">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-28 lg:py-36">
        <FadeUp className="text-center mb-16 lg:mb-20">
          <p className="text-[12px] uppercase tracking-[0.3em] text-neon mb-5">
            {headline || "The gallery"}
          </p>
          <h2 className="font-cormorant text-5xl sm:text-6xl lg:text-7xl leading-[0.98] tracking-[-0.01em]">
            A look at every <span className="italic text-neon">set</span>
          </h2>
        </FadeUp>

        <div className="space-y-6 lg:space-y-8">
          {rows.map((t, i) => {
            const textLeft = i % 2 !== 0;
            const num = String(i + 1).padStart(2, "0");
            const panel = (
              <div
                key="panel"
                className={`flex flex-col justify-center rounded-[20px] p-9 ${
                  textLeft
                    ? "bg-rose text-ink order-last lg:order-first"
                    : "bg-ink text-cream"
                }`}
              >
                <span
                  className={`text-[11px] uppercase tracking-[0.24em] ${
                    textLeft ? "text-neon" : "text-neonsoft"
                  }`}
                >
                  {num} — {t.category}
                </span>
                <h3 className="font-cormorant text-4xl lg:text-5xl mt-3 leading-[0.98]">
                  {t.title}
                </h3>
                <p
                  className={`mt-5 leading-relaxed ${
                    textLeft ? "text-ink/65" : "text-cream/65"
                  }`}
                >
                  {t.description}
                </p>
                <Link
                  href={resolveHref(t.href)}
                  className="mt-7 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.18em] text-neon hover:gap-3 transition-all"
                >
                  Book this look &rarr;
                </Link>
              </div>
            );

            const images = [
              <GalleryImage key="img0" img={t.images[0]} />,
              <GalleryImage
                key="img1"
                img={t.images[1] ?? t.images[0]}
                detail
              />,
            ];

            return (
              <FadeUp
                key={t.id ?? i}
                className="grid lg:grid-cols-3 gap-5 lg:gap-6"
              >
                {textLeft ? [panel, ...images] : [...images, panel]}
              </FadeUp>
            );
          })}
        </div>
      </div>
    </section>
  );
}
