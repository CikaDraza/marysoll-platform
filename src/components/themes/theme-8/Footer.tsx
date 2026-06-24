"use client";

import Image from "next/image";
import type { SalonProfileData } from "@/types";
import { FadeUp } from "./FadeUp";
import { Deco } from "./Decorations";
import { Theme8WorkingHours } from "./WorkingHours";
import { useTheme8Modal } from "./Theme8ModalProvider";
import { Theme8AnchorLink } from "./AnchorLink";
import Link from "next/link";

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
  { label: "Menu", href: "#services" },
  { label: "Gallery", href: "#gallery" },
  { label: "Q&A", href: "#faq" },
];

export function Theme8Footer({
  salonName,
  logo,
  instagramUrl,
  instagramHandle,
  email,
  workingHours,
}: Props) {
  const { open } = useTheme8Modal();
  const displayName = salonName ?? "The Lash Room by Anja";
  const logoSrc = logo || "/images/theme-8/logo-line.png";
  const handle = instagramHandle || "@lashroom_byanja";

  return (
    <footer
      id="book"
      className="relative max-w-[1180px] mx-auto mt-28 mb-16 px-5"
    >
      <FadeUp>
        <div className="relative bg-y2k-ink rounded-[34px] p-10 sm:p-12 overflow-hidden rotate-[-1deg] shadow-[0_30px_70px_rgba(20,0,30,0.5)]">
          <div className="absolute inset-0 bg-[radial-gradient(70%_90%_at_80%_10%,rgba(255,46,151,0.4),transparent_60%)] pointer-events-none" />
          <Deco
            shape="star"
            size={60}
            fill="#ff2e97"
            stroke="#fff"
            strokeWidth={4}
            motionType="bob"
            className="absolute left-[0%] sm:left-[6%] bottom-[10%] sm:bottom-[18%] rotate-[-10deg]"
          />

          <div className="relative grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
            <div>
              <h2 className="m-0 mb-5 font-bagel text-[clamp(40px,6.5vw,82px)] leading-[0.86] text-white">
                Spremni za vase
                <br />
                <span className="text-y2k-hot">
                  najbolje trepavice do sada?
                </span>
              </h2>
              <div className="flex flex-wrap gap-3.5">
                <button
                  type="button"
                  onClick={() => open("book")}
                  className="inline-flex items-center gap-2.5 bg-y2k-pink text-white font-black text-[17px] tracking-[0.04em] uppercase px-7 py-4 border-[4px] border-white rounded-[42px_34px_44px_32px/34px_44px_32px_44px] shadow-[7px_7px_0_rgba(255,46,151,0.45)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer"
                >
                  To book
                </button>
                <button
                  type="button"
                  onClick={() => open("bilten")}
                  className="inline-flex items-center gap-2 bg-white text-y2k-purple font-extrabold text-[16px] tracking-[0.03em] uppercase px-6 py-4 border-[4px] border-y2k-ink rounded-[36px_44px_32px_42px/44px_32px_44px_34px] shadow-[6px_6px_0_#8B16C9] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer"
                >
                  Bilten →
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 text-white">
              <div>
                <div className="font-extrabold text-[12px] tracking-[0.2em] uppercase text-y2k-hot mb-3">
                  Explore
                </div>
                {EXPLORE.map((l) => (
                  <Theme8AnchorLink
                    key={l.href}
                    href={l.href}
                    className="block font-semibold text-[15px] py-1.5 text-white/85 hover:text-y2k-hot transition-colors"
                  >
                    {l.label}
                  </Theme8AnchorLink>
                ))}
              </div>
              <div>
                <div className="font-extrabold text-[12px] tracking-[0.2em] uppercase text-y2k-hot mb-3">
                  Visit
                </div>
                <Theme8WorkingHours workingHours={workingHours} />
                <div className="mt-3 flex flex-col gap-1.5">
                  <Link
                    href={instagramUrl || "#"}
                    target={instagramUrl ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="font-bold text-[15px] text-y2k-hot hover:text-white transition-colors"
                  >
                    {handle}
                  </Link>
                  {email && (
                    <Link
                      href={`mailto:${email}`}
                      className="font-semibold text-[15px] text-white/85 hover:text-y2k-hot transition-colors"
                    >
                      Send a message
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-10 pt-5 border-t border-white/15 flex justify-between items-center flex-wrap gap-3.5">
            <Image
              src={logoSrc}
              alt={displayName}
              width={140}
              height={40}
              className="h-10 w-auto object-contain [filter:invert(1)_brightness(2)]"
            />
            <span className="text-white/55 text-[13px] font-medium">
              © {new Date().getFullYear()} {displayName} ·{" "}
              <Link
                href="https://marysoll.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-y2k-hot hover:underline"
              >
                Powered by Marysoll
              </Link>
            </span>
          </div>
        </div>
      </FadeUp>
    </footer>
  );
}
