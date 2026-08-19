/**
 * Theme9Credentials — stubovi kredibiliteta.
 *
 * Namerno bez statistike i bez citata klijenata: iskustva dobijaju svoj blok
 * (`content.testimonials`) tek kada budu stvarna.
 */
import { Eyebrow } from "./primitives";
import { Reveal } from "./Reveal";

export interface Theme9CredentialsProps {
  eyebrow?: string;
  headline?: string;
  lead?: string;
  pillars: { title: string; text?: string }[];
  note?: string;
}

export function Theme9Credentials({
  eyebrow,
  headline,
  lead,
  pillars,
  note,
}: Theme9CredentialsProps) {
  if (pillars.length === 0) return null;

  return (
    <section id="iskustva" className="bg-ee-surface">
      <div className="mx-auto max-w-[1240px] px-5 py-14 md:px-8 md:py-20 lg:px-14 lg:py-[110px]">
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div className="flex max-w-[42ch] flex-col gap-3">
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

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,265px),1fr))] gap-4">
          {pillars.map((p, i) => (
            <Reveal key={p.title} delay={i * 60}>
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

        {note && (
          <p className="font-instrument-sans text-ee-text-muted mt-6 max-w-[64ch] text-[13px] leading-relaxed italic">
            {note}
          </p>
        )}
      </div>
    </section>
  );
}
