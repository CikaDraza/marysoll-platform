/**
 * Theme9Credentials — stubovi kredibiliteta.
 *
 * Namerno bez statistike i bez citata klijenata: iskustva dobijaju svoj blok
 * (`content.testimonials`) tek kada budu stvarna.
 */
import Image from "next/image";
import { Eyebrow } from "./primitives";
import { Reveal } from "./Reveal";

export interface Theme9CredentialsProps {
  eyebrow?: string;
  headline?: string;
  lead?: string;
  pillars: { title: string; text?: string }[];
  note?: string;
  /**
   * Instagram kartica — šesta ćelija u mreži stubova, forest podloga sa 2×2
   * mrežom slika. Renderuje se samo kad ima bar naslov ili slike.
   */
  social?: {
    label?: string;
    title?: string;
    linkLabel?: string;
    url?: string;
    images?: { src: string; alt?: string }[];
  };
}

export function Theme9Credentials({
  eyebrow,
  headline,
  lead,
  pillars,
  note,
  social,
}: Theme9CredentialsProps) {
  if (pillars.length === 0) return null;

  return (
    <section id="iskustva" className="bg-ee-surface">
      <div className="mx-auto max-w-[1240px] px-5 py-14 md:px-8 md:py-20 lg:px-14 lg:py-[110px]">
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div className="flex max-w-[42ch] flex-col gap-4">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {headline && (
              <h2 className="font-newsreader text-ee-accent text-[clamp(30px,3.7vw,52px)] leading-[1.05] tracking-[-0.024em]">
                {headline}
              </h2>
            )}
          </div>
          {lead && (
            <p className="font-instrument-sans text-ee-text-muted max-w-[44ch] text-[15.5px] leading-[1.7]">
              {lead}
            </p>
          )}
        </Reveal>

        {/* Instagram ide u SVOJU desnu kolonu (1/4 širine, puna visina) da
            njegova visina ne rasteže kolonu sa stubovima. Stubovi se levo šire
            koliko im treba i prelamaju u drugi red, jednakih visina.
            Na mobilnom je sve jedna kolona. */}
        <div
          className={`grid gap-4 ${social ? "lg:grid-cols-4" : ""}`}
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,265px),1fr))] gap-4 lg:col-span-3">
            {pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 60} className="h-full">
                <article className="bg-ee-surface-muted flex h-full flex-col gap-2.5 rounded-[20px] p-6">
                  <h3 className="font-newsreader text-ee-accent text-[20px] leading-snug">
                    {p.title}
                  </h3>
                  {p.text && (
                    <p className="font-instrument-sans text-ee-text-muted text-[14.5px] leading-[1.65]">
                      {p.text}
                    </p>
                  )}
                </article>
              </Reveal>
            ))}
          </div>

          {social && (social.title || social.images?.length) && (
            <Reveal delay={pillars.length * 60} className="lg:col-span-1 lg:h-full">
              <div className="bg-ee-accent text-ee-canvas flex h-full flex-col gap-[18px] rounded-[20px] p-6 lg:p-8">
                {social.label && (
                  <span className="text-ee-accent-contrast text-[11px] tracking-[0.14em] uppercase">
                    {social.label}
                  </span>
                )}
                {social.title && (
                  <p className="font-newsreader text-[22px] leading-[1.3] text-white">
                    {social.title}
                  </p>
                )}

                {social.images && social.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {social.images.slice(0, 4).map((img) => (
                      <div
                        key={img.src}
                        className="relative aspect-square overflow-hidden rounded-[12px]"
                      >
                        <Image
                          src={img.src}
                          alt={img.alt ?? ""}
                          fill
                          sizes="(max-width: 768px) 40vw, 12vw"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {social.url && social.linkLabel && (
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ee-accent-contrast mt-auto text-[13.5px] font-semibold"
                  >
                    {social.linkLabel} →
                  </a>
                )}
              </div>
            </Reveal>
          )}
        </div>

        {note && (
          <p className="font-instrument-sans text-ee-text-muted mt-6 max-w-[64ch] text-[13px] leading-relaxed italic">
            {note}
          </p>
        )}
      </div>
    </section>
  );
}
