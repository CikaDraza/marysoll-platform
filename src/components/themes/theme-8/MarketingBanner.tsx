import Image from "next/image";
import type { MarketingBanner as MarketingBannerData } from "@/types/theme8-marketing";
import { Theme8AnchorLink } from "./AnchorLink";

interface Props {
  banner: MarketingBannerData;
  resolveHref: (href: string) => string;
}

function Description({ banner }: { banner: MarketingBannerData }) {
  const description = banner.description?.trim();
  if (!description) return null;
  const accent = banner.accentPhrase?.trim();
  const index = accent ? description.indexOf(accent) : -1;
  return (
    <p className="mx-auto mt-4 max-w-[760px] text-[18px] sm:text-[21px] leading-[1.55] font-medium text-y2k-baby-pink">
      {index < 0 ? description : <>
        {description.slice(0, index)}
        <span className="text-y2k-pink font-bold">{accent}</span>
        {description.slice(index + (accent?.length ?? 0))}
      </>}
    </p>
  );
}

function BannerDivider({ url, full }: { url?: string; full: boolean }) {
  if (!url?.trim()) return null;
  return (
    <div className={`relative z-10 mx-auto mb-10 w-full px-5 ${full ? "max-w-none" : "max-w-[1180px]"}`}>
      <Image src={url} alt="" width={841} height={98} unoptimized className="w-full h-auto" />
    </div>
  );
}

function BannerBackground({ url }: { url?: string }) {
  if (!url?.trim()) return null;
  return (
    <div className="absolute inset-0 hidden lg:block overflow-hidden">
      <Image src={url} alt="" fill sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-y2k-ink/70" />
    </div>
  );
}

function BannerPhoto({ banner, full }: { banner: MarketingBannerData; full: boolean }) {
  return (
    <div className={`relative w-full bg-white p-2.5 pb-3.5 border-[3px] border-y2k-ink shadow-[6px_8px_0_#8B16C9] ${full
      ? "rotate-[-2deg] lg:order-2 lg:rotate-[2deg]"
      : "rotate-[-2deg]"}`}>
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        <Image
          src={banner.image.url}
          alt={banner.image.alt}
          fill
          sizes={full
            ? "(min-width: 1024px) 38vw, (min-width: 768px) 75vw, 90vw"
            : "(min-width: 768px) 760px, 90vw"}
          className="object-cover"
        />
      </div>
    </div>
  );
}

function bannerCtaHref(banner: MarketingBannerData, resolveHref: Props["resolveHref"]): string | null {
  if (!banner.cta?.enabled) return null;
  const url = banner.cta.destination.type === "edu-center"
    ? "/edukacija"
    : banner.cta.destination.url.trim();
  return url ? resolveHref(url) : null;
}

function BannerCopy({ banner, href, full }: { banner: MarketingBannerData; href: string | null; full: boolean }) {
  return (
    <div className={full ? "mt-12 text-center lg:order-1 lg:mt-0" : "mt-12 text-center"}>
      {(banner.title?.trim() || banner.description?.trim()) && (
        <div className="w-full bg-y2k-ink border-[3px] border-y2k-ink p-6 rounded-[8px_22px_8px_22px] shadow-[6px_8px_0_#ff2e97] rotate-[-2deg]">
          {banner.title?.trim() && (
            <h2 className="font-bagel text-[clamp(36px,5.5vw,66px)] leading-[1.05] text-y2k-baby-pink">
              {banner.title}
            </h2>
          )}
          <Description banner={banner} />
        </div>
      )}
      {href && (
        <Theme8AnchorLink
          href={href}
          className="mt-10 inline-flex w-fit items-center rounded-full border-[4px] border-y2k-ink bg-y2k-pink px-7 py-3.5 font-extrabold uppercase tracking-[0.04em] text-white shadow-[6px_6px_0_#0b0b0f] transition-transform hover:-translate-y-1"
        >
          {banner.cta?.label?.trim() || "Saznaj više"}
        </Theme8AnchorLink>
      )}
    </div>
  );
}

export function MarketingBanner({ banner, resolveHref }: Props) {
  if (!banner.enabled || !banner.image.url.trim()) return null;
  const full = banner.containerStyle === "full-width";
  return (
    <section
      id={`marketing-${banner.id}`}
      aria-label={banner.name || banner.title || "Marketing banner"}
      className={`relative w-full my-24 ${full ? "lg:w-screen lg:left-1/2 lg:-translate-x-1/2" : ""}`}
    >
      <BannerDivider url={banner.divider?.enabled ? banner.divider.url : undefined} full={full} />
      <div className={`relative ${full ? "lg:min-h-[610px] lg:py-20" : ""}`}>
        {full && <BannerBackground url={banner.backgroundImage?.url} />}
        <div className={`relative z-10 mx-auto px-5 ${full
          ? "max-w-[1180px] lg:grid lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-14"
          : "max-w-[1180px]"}`}>
          <BannerPhoto banner={banner} full={full} />
          <BannerCopy banner={banner} href={bannerCtaHref(banner, resolveHref)} full={full} />
        </div>
      </div>
    </section>
  );
}
