// components/marketing/PlatformFooter.tsx
//
// Shared platform footer used across marysoll.com marketing/CMS pages
// (home, /pricing, /privacy, /terms-and-conditions, /kontakt, ...).
// Self-contained async server component — fetches social links itself.

import Link from "next/link";
import Image from "next/image";
import { getPlatformSocial } from "@/lib/server/getPlatformSocial";
import InstagramIcon from "@/components/assets/icons/InstagramIcon";
import WhatsappIcon from "@/components/assets/icons/WhatsappIcon";
import TiktokIcon from "@/components/assets/icons/TiktokIcon";
import FacebookIcon from "@/components/assets/icons/FacebookIcon";
import TelegramIcon from "@/components/assets/icons/TelegramIcon";

export async function PlatformFooter() {
  const social = await getPlatformSocial();

  const SOCIAL_LINKS = [
    { href: social.instagram, Icon: InstagramIcon },
    { href: social.whatsapp, Icon: WhatsappIcon },
    { href: social.tiktok, Icon: TiktokIcon },
    { href: social.facebook, Icon: FacebookIcon },
    { href: social.telegram, Icon: TelegramIcon },
  ];

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-2xl">
            <Link href="/" className="flex gap-2">
              <Image
                src={"/marysoll_elegant_logo.png"}
                alt={"Marysoll logo"}
                width={192}
                height={192}
                className="h-12 w-12 object-contain"
                priority
              />
              <div className="flex flex-col">
                <span className="text-md/9 text-white heading-font">
                  Marysoll
                </span>
                <small className="text-[0.5rem] text-white -mt-1">
                  je napravila nešto sasvim drugačije
                </small>
              </div>
            </Link>
          </div>

          <div className="flex gap-8 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white transition">
              Privacy
            </Link>
            <Link
              href="/terms-and-conditions"
              className="hover:text-white transition"
            >
              Terms
            </Link>
            <Link href="/refund" className="hover:text-white transition">
              Refund Policy
            </Link>
            <Link href="/pricing" className="hover:text-white transition">
              Pricing
            </Link>
            <Link href="/kontakt" className="hover:text-white transition">
              Contact
            </Link>
            <Link
              href="https://booking.marysoll.com"
              className="hover:text-white transition"
            >
              Pronađi termin
            </Link>
          </div>

          <div className="flex gap-3">
            {SOCIAL_LINKS.map(({ href, Icon }, i) =>
              href ? (
                <Link
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-violet-600 transition"
                >
                  <Icon bgColor="#ffffff" width={20} height={20} />
                </Link>
              ) : (
                <span
                  key={i}
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center opacity-25 cursor-not-allowed"
                >
                  <Icon bgColor="#ffffff" width={20} height={20} />
                </span>
              ),
            )}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} MarySoll. Tvoja drugarica iz salona. 💜
        </div>
      </div>
    </footer>
  );
}
