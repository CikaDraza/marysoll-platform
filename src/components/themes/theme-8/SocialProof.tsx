import Link from "next/link";
import { FadeUp } from "./FadeUp";

interface Props {
  /** Instagram profile URL (for the link href). */
  instagramUrl?: string;
  /** @handle shown on the IG card. */
  instagramHandle?: string;
}

const STATS = [
  {
    value: "98%",
    label: "Rebook rate",
    cls: "rotate-[-3deg] bg-y2k-ink text-white shadow-[6px_7px_0_rgba(255,46,151,0.6)]",
    valueCls: "text-y2k-hot",
  },
  {
    value: "5.0",
    label: "Google reviews",
    cls: "rotate-[2deg] bg-y2k-pink text-white border-[4px] border-y2k-ink shadow-[6px_7px_0_#0b0b0f]",
    valueCls: "",
  },
  {
    value: "24h",
    label: "Avg. booking wait",
    cls: "rotate-[-2deg] bg-white text-y2k-ink border-[4px] border-y2k-ink shadow-[6px_7px_0_#8B16C9]",
    valueCls: "text-y2k-purple",
  },
];

export function Theme8SocialProof({ instagramUrl, instagramHandle }: Props) {
  const handle = instagramHandle || "@lashroom_byanja";

  return (
    <section className="relative max-w-[1180px] mx-auto my-24 px-5">
      <FadeUp className="flex flex-wrap gap-5 justify-center items-center">
        {STATS.map((s) => (
          <div
            key={s.label}
            className={`rounded-3xl px-7 py-6 min-w-[200px] text-center ${s.cls}`}
          >
            <div
              className={`font-bagel text-[54px] leading-none ${s.valueCls}`}
            >
              {s.value}
            </div>
            <div className="font-bold text-[13px] tracking-[0.14em] uppercase mt-1.5">
              {s.label}
            </div>
          </div>
        ))}
        <Link
          href={instagramUrl || "#"}
          target={instagramUrl ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="block rotate-[3deg] min-w-[220px] text-center rounded-3xl px-7 py-6 text-white border-[4px] border-y2k-ink bg-[linear-gradient(135deg,#8B16C9,#ff2e97)] shadow-[6px_7px_0_#0b0b0f] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform duration-200"
        >
          <div className="font-caveat font-bold text-[34px] leading-none">
            {handle}
          </div>
          <div className="font-bold text-[13px] tracking-[0.14em] uppercase mt-1.5">
            As loved on IG →
          </div>
        </Link>
      </FadeUp>
    </section>
  );
}
