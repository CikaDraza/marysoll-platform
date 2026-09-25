import Image from "next/image";
import educationPoster from "../../../../public/images/theme-8/edu-the-lash-room-byAnja.jpg";
import { theme8ImageLoaderFor } from "@/helpers/theme8CloudinaryImage";
import { isInstagramDmLink } from "@/helpers/theme8Voucher";
import type { MarketingBanner as MarketingBannerData } from "@/types/theme8-marketing";
import { Theme8AnchorLink } from "./AnchorLink";
import { FadeUp } from "./FadeUp";
import { useTheme8Modal } from "./theme8ModalContext";

interface Props {
  banner: MarketingBannerData;
  resolveHref: (href: string) => string;
  tenantSlug?: string;
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
      <Image src={url} alt="" width={841} height={98} loading="lazy" unoptimized className="w-full h-auto" />
    </div>
  );
}

function BannerBackground({ url }: { url?: string }) {
  if (!url?.trim()) return null;
  return (
    <div className="absolute inset-0 hidden lg:block overflow-hidden">
      <Image src={url} loader={theme8ImageLoaderFor(url)} alt="" fill loading="lazy" sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-y2k-ink/70" />
    </div>
  );
}

function BannerPhoto({ banner, full }: { banner: MarketingBannerData; full: boolean }) {
  const isEducationPoster = banner.image.url === "/images/theme-8/edu-the-lash-room-byAnja.jpg";
  return (
    <div className={`relative w-full bg-white p-2.5 pb-3.5 border-[3px] border-y2k-ink shadow-[6px_8px_0_#8B16C9] ${full
      ? "rotate-[-2deg] lg:rotate-[2deg]"
      : "rotate-[-2deg]"}`}>
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        <Image
          src={isEducationPoster ? educationPoster : banner.image.url}
          loader={isEducationPoster ? undefined : theme8ImageLoaderFor(banner.image.url)}
          alt={banner.image.alt}
          fill
          loading="lazy"
          placeholder={isEducationPoster ? "blur" : "empty"}
          sizes={full
            ? "(min-width: 1024px) 520px, calc(100vw - 40px)"
            : "(min-width: 1200px) 1140px, calc(100vw - 40px)"}
          className="object-cover"
        />
      </div>
    </div>
  );
}

function bannerCtaHref(banner: MarketingBannerData, resolveHref: Props["resolveHref"]): string | null {
  if (!banner.cta?.enabled || banner.cta.destination.type === "modal") return null;
  const url = banner.cta.destination.type === "edu-center"
    ? "/edukacija"
    : banner.cta.destination.url.trim();
  return url ? resolveHref(url) : null;
}

const CTA_CLASS = "mt-10 inline-flex w-fit items-center rounded-full border-[4px] border-y2k-ink bg-y2k-pink px-7 py-3.5 font-extrabold uppercase tracking-[0.04em] text-white shadow-[6px_6px_0_#0b0b0f] transition-transform hover:-translate-y-1";

function BannerCopy({ banner, href, trackedHref, full, onOpenVoucher }: {
  banner: MarketingBannerData;
  href: string | null;
  trackedHref: string | null;
  full: boolean;
  onOpenVoucher: () => void;
}) {
  const label = banner.cta?.label?.trim() || "Saznaj više";
  const modal = banner.cta?.enabled && banner.cta.destination.type === "modal";
  return (
    <div className={full ? "mt-12 text-center lg:mt-0" : "mt-12 text-center"}>
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
      {modal ? (
        <button type="button" onClick={onOpenVoucher} className={CTA_CLASS}>{label}</button>
      ) : trackedHref ? (
        <form action={trackedHref} method="post">
          <button type="submit" className={CTA_CLASS}>{label}</button>
        </form>
      ) : href ? (
        <Theme8AnchorLink href={href} className={CTA_CLASS}>{label}</Theme8AnchorLink>
      ) : null}
    </div>
  );
}

export function MarketingBanner({ banner, resolveHref, tenantSlug }: Props) {
  const { open } = useTheme8Modal();
  if (!banner.enabled || !banner.image.url.trim()) return null;
  const full = banner.containerStyle === "full-width";
  const destination = banner.cta?.destination;
  const trackedHref = banner.id === "education" && destination?.type === "custom" &&
    isInstagramDmLink(destination.url) && tenantSlug
      ? `/api/public/${encodeURIComponent(tenantSlug)}/education-dm`
      : null;
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
          <FadeUp className={full ? "lg:order-2" : undefined}>
            <BannerPhoto banner={banner} full={full} />
          </FadeUp>
          <FadeUp delay={0.12} className={full ? "lg:order-1" : undefined}>
            <BannerCopy banner={banner} href={bannerCtaHref(banner, resolveHref)} trackedHref={trackedHref} full={full} onOpenVoucher={() => open("voucher")} />
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
