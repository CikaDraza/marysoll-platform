import Image from "next/image";
import type { SalonProfileData } from "@/types";
import { FadeUp } from "./FadeUp";
import { Theme7WorkingHours } from "./WorkingHours";
import { AnchorLink } from "../shared/AnchorLink";

interface Props {
  salonName?: string;
  logo?: string | null;
  instagramUrl?: string;
  instagramHandle?: string;
  email?: string;
  workingHours?: SalonProfileData["workingHours"] | null;
}

const EXPLORE = [
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Gallery", href: "#gallery" },
  { label: "Reviews", href: "#reviews" },
];

export function Theme7Footer({
  salonName,
  logo,
  instagramUrl,
  instagramHandle,
  email,
  workingHours,
}: Props) {
  const displayName = salonName ?? "The Lash Room";
  const logoSrc = logo || "/images/theme-7/logo.jpg";
  const handle = instagramHandle || "@lashroom_byanja";

  return (
    <footer id="book" className="relative bg-ink text-cream overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_80%_0%,#ff2e8840_0%,#ff2e8800_60%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-neon shadow-[0_0_40px_8px_#ff2e88]" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-24 lg:pt-28 pb-12">
        <div className="grid lg:grid-cols-12 gap-14 lg:gap-10">
          <FadeUp className="lg:col-span-5">
            <h2 className="font-cormorant text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-[-0.01em]">
              Are you ready for your
              <br />
              <span className="italic text-neon drop-shadow-[0_0_24px_#ff2e88aa]">
                best version of yourself?
              </span>
            </h2>
            <AnchorLink
              href="#top"
              offset={90}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-neon px-7 py-3.5 text-[13px] uppercase tracking-[0.18em] font-medium text-white shadow-[0_12px_40px_-10px_#ff2e88] hover:-translate-y-0.5 transition-all duration-300"
            >
              Choose your date &uarr;
            </AnchorLink>
          </FadeUp>

          <div className="lg:col-span-7 grid sm:grid-cols-3 gap-10 lg:pl-10 lg:border-l lg:border-cream/10">
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.22em] text-cream/40 mb-4">
                Explore
              </h4>
              <ul className="space-y-2.5 text-[15px] text-cream/75">
                {EXPLORE.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="hover:text-neon transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="sm:col-span-2">
              <h4 className="text-[11px] uppercase tracking-[0.22em] text-cream/40 mb-4">
                Visit
              </h4>
              <Theme7WorkingHours workingHours={workingHours} />
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.22em] text-cream/40 mb-4">
                Connect
              </h4>
              <ul className="space-y-2.5 text-[15px] text-cream/75">
                <li>
                  <a
                    href={instagramUrl || "#"}
                    target={instagramUrl ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="hover:text-neon transition-colors"
                  >
                    {handle}
                  </a>
                </li>
                <li>
                  <a
                    href={email ? `mailto:${email}` : "#"}
                    className="hover:text-neon transition-colors"
                  >
                    Send a message
                  </a>
                </li>
                <li>
                  <AnchorLink
                    href="#book"
                    offset={90}
                    className="hover:text-neon transition-colors"
                  >
                    Book now
                  </AnchorLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-20 pt-8 border-t border-cream/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src={logoSrc}
              alt={displayName}
              width={32}
              height={32}
              className="h-8 w-8 rounded-md object-cover"
            />
            <span className="font-cormorant text-lg">{displayName}</span>
          </div>
          <p className="text-[12px] uppercase tracking-[0.16em] text-cream/35">
            © {new Date().getFullYear()} {displayName} · Powered by Marysoll
          </p>
        </div>
      </div>
    </footer>
  );
}
