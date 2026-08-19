/**
 * Theme9GuidedCareProcess — metod rada kroz korake.
 * Gornja linija svakog koraka slabi udesno (100 → 18%), po prototipu.
 */
import { Eyebrow } from "./primitives";
import { Reveal } from "./Reveal";

export interface Theme9GuidedCareProcessProps {
  eyebrow?: string;
  headline?: string;
  lead?: string;
  steps: { title: string; text?: string }[];
}

/** Opadajuća jačina gornje linije; ostatak koraka pada na najslabiju. */
const RULE_OPACITY = [1, 0.6, 0.45, 0.3, 0.18];

export function Theme9GuidedCareProcess({
  eyebrow,
  headline,
  lead,
  steps,
}: Theme9GuidedCareProcessProps) {
  if (steps.length === 0) return null;

  return (
    <section id="kako-radim" className="bg-ee-canvas">
      <div className="mx-auto max-w-[1240px] px-5 py-14 md:px-8 md:py-20 lg:px-14 lg:py-[110px]">
        <Reveal className="mb-9 flex max-w-[46ch] flex-col gap-3">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          {headline && (
            <h2 className="font-newsreader text-ee-accent text-[clamp(30px,3.7vw,52px)] leading-[1.05] tracking-[-0.024em]">
              {headline}
            </h2>
          )}
          {lead && (
            <p className="font-instrument-sans text-ee-text-muted text-[16px] leading-[1.72]">
              {lead}
            </p>
          )}
        </Reveal>

        <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,185px),1fr))] gap-3.5 lg:gap-[26px]">
          {steps.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={i * 60} className="flex h-full flex-col gap-3 pt-4">
                <span
                  aria-hidden
                  className="bg-ee-accent block h-[2px] w-full"
                  style={{
                    opacity: RULE_OPACITY[i] ?? RULE_OPACITY[RULE_OPACITY.length - 1],
                  }}
                />
                <span className="font-newsreader text-ee-sage text-[15px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-newsreader text-ee-accent text-[21px] leading-snug">
                  {step.title}
                </h3>
                {step.text && (
                  <p className="font-instrument-sans text-ee-text-muted text-[14.5px] leading-[1.65]">
                    {step.text}
                  </p>
                )}
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
