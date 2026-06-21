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
    id: "lashlift",
    category: "category",
    title: "Lash Lift",
    description:
      "Your natural lashes lifted & tinted — wide-awake doll eyes, zero extensions.",
    images: [
      { src: "/images/theme-8/lash-classic.png", alt: "Lash lift" },
      { src: "/images/theme-8/lash-classic.png", alt: "Lash lift detail" },
    ],
    href: "/termini",
  },
  {
    id: "lvolume",
    category: "category",
    title: "L Volume",
    description:
      "Handmade L-curl fans, elongated outward for that lifted feline shape.",
    images: [
      { src: "/images/theme-8/lash-hybrid.png", alt: "L volume lashes" },
      { src: "/images/theme-8/lash-hybrid.png", alt: "L volume detail" },
    ],
    href: "/termini",
  },
  {
    id: "deepbrown",
    category: "category",
    title: "Deep Brown",
    description:
      "Warm brown sets for a softer, sun-kissed volume — bold without the harsh black.",
    images: [
      { src: "/images/theme-8/lash-deepbrown.png", alt: "Deep brown set" },
      { src: "/images/theme-8/lash-deepbrown.png", alt: "Deep brown detail" },
    ],
    href: "/termini",
  },
];

/** Panel colour styles cycle dark → pink → purple, matching the Y2K mockup. */
const PANEL_STYLES = [
  {
    wrap: "bg-y2k-ink text-white shadow-[6px_8px_0_rgba(255,46,151,0.6)] rotate-[1deg]",
    cat: "text-y2k-hot",
    body: "text-[#e8d9e4]",
  },
  {
    wrap: "bg-y2k-pink text-white border-[4px] border-y2k-ink shadow-[6px_8px_0_#0b0b0f] rotate-[-1deg]",
    cat: "text-y2k-ink",
    body: "text-white/95",
  },
  {
    wrap: "bg-y2k-purple text-white border-[4px] border-y2k-ink shadow-[6px_8px_0_#0b0b0f] rotate-[1deg]",
    cat: "text-y2k-hot",
    body: "text-[#f0e3f7]",
  },
];

function Polaroid({
  img,
  rotate,
  detail = false,
}: {
  img: { src: string; alt: string };
  rotate: string;
  detail?: boolean;
}) {
  if (!img?.src) return null;
  return (
    <div
      className={`bg-white p-[9px] border-2 border-y2k-ink shadow-[5px_8px_18px_rgba(11,11,15,0.3)] ${rotate}`}
    >
      <div className="relative overflow-hidden h-[280px]">
        <Image
          src={img.src}
          alt={img.alt}
          fill
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw"
          className={`object-cover ${
            detail ? "object-[60%_22%] scale-150" : ""
          }`}
        />
      </div>
    </div>
  );
}

export function Theme8GallerySection({
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
    <section
      id="gallery"
      className="relative max-w-[1180px] mx-auto my-28 px-5"
    >
      <FadeUp className="relative text-center mb-12">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[48%] w-[560px] max-w-[104%] h-[200px] -translate-x-1/2 -translate-y-1/2 scale-110 opacity-90 z-0 pointer-events-none"
        >
          <Image
            src="/images/theme-8/paint-streak.png"
            alt=""
            fill
            sizes="560px"
            className="object-cover"
          />
        </div>
        <span className="relative z-[1] inline-block font-extrabold text-[12px] tracking-[0.24em] uppercase text-y2k-pink">
          {headline || "The gallery"}
        </span>
        <h2 className="mt-1.5 font-bagel text-[clamp(44px,7vw,92px)] leading-[0.9] text-white [-webkit-text-stroke:3px_#0b0b0f] [text-shadow:5px_6px_0_rgba(255,46,151,0.7)] rotate-[-1deg]">
          EVERY SET
        </h2>
      </FadeUp>

      <div className="space-y-16">
        {rows.map((t, i) => {
          const textLeft = i % 2 !== 0;
          const num = String(i + 1).padStart(2, "0");
          const ps = PANEL_STYLES[i % PANEL_STYLES.length];
          const panel = (
            <div
              key="panel"
              className={`rounded-[22px] p-7 ${ps.wrap} ${
                textLeft ? "order-1" : ""
              }`}
            >
              <span className={`font-caveat font-bold text-[24px] ${ps.cat}`}>
                {num} — {t.category}
              </span>
              <h3 className="mt-1 mb-2.5 font-bagel text-[34px] leading-[0.95]">
                {t.title}
              </h3>
              <p
                className={`m-0 text-[15px] leading-[1.55] font-medium ${ps.body}`}
              >
                {t.description}
              </p>
              <Link
                href={resolveHref(t.href)}
                className="mt-5 inline-flex items-center gap-2 font-extrabold text-[12px] uppercase tracking-[0.14em] hover:gap-3 transition-all"
              >
                Book this look →
              </Link>
            </div>
          );

          const images = [
            <Polaroid
              key="img0"
              img={t.images[0]}
              rotate={textLeft ? "rotate-[2deg] order-2" : "rotate-[-2deg]"}
            />,
            <Polaroid
              key="img1"
              img={t.images[1] ?? t.images[0]}
              rotate={textLeft ? "rotate-[-2deg] order-3" : "rotate-[2deg]"}
              detail
            />,
          ];

          return (
            <FadeUp
              key={t.id ?? i}
              className={`grid lg:grid-cols-3 gap-[18px] items-center ${
                i % 2 === 0 ? "rotate-[-1.5deg]" : "rotate-[1.5deg]"
              }`}
            >
              {textLeft ? [panel, ...images] : [...images, panel]}
            </FadeUp>
          );
        })}
      </div>
    </section>
  );
}
