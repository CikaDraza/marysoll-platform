import { FadeUp } from "./FadeUp";

interface Props {
  /** Instagram profile URL (for the link href). */
  instagramUrl?: string;
  /** @handle shown as the big serif link. */
  instagramHandle?: string;
}

const STATS = [
  { value: "98", suffix: "%", label: "Rebook rate" },
  { value: "5", suffix: ".0", label: "Google reviews" },
  { value: "24h", suffix: "", label: "Avg. booking wait" },
];

export function Theme7SocialProof({ instagramUrl, instagramHandle }: Props) {
  const handle = instagramHandle || "@lashroom_byanja";

  return (
    <section className="relative bg-ink text-cream overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_50%_0%,#ff2e8838_0%,#ff2e8800_60%)]" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-24">
        <FadeUp className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <p className="text-[12px] uppercase tracking-[0.3em] text-neonsoft mb-4">
              As loved on Instagram
            </p>
            <a
              href={instagramUrl || "#"}
              target={instagramUrl ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="font-cormorant text-4xl sm:text-5xl hover:text-neon transition-colors"
            >
              {handle}
            </a>
            <p className="mt-4 text-cream/60 max-w-md">
              Thousands of reels, hundreds of regulars, and a feed full of real
              client lashes — no filters needed.
            </p>
          </div>
          <div className="lg:col-span-7 grid grid-cols-3 gap-6 lg:gap-10 lg:border-l lg:border-cream/10 lg:pl-12">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="font-cormorant text-5xl lg:text-6xl">
                  {s.value}
                  {s.suffix && <span className="text-neon">{s.suffix}</span>}
                </div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-cream/50 mt-2">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
