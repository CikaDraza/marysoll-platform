"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import LoggedButton from "@/components/auth/LoggedButton";
import Link from "next/link";

interface Theme8HeaderProps {
  instagramUrl?: string;
  tenantSlug?: string;
  /** Real DB slug — always set, used for LoggedButton panel links. */
  clientSlug?: string;
  salonName?: string;
  salonLogo?: string | null;
}

/**
 * Theme8Header — Y2K floating-pill nav. A rotated, thick-bordered glassy pill that
 * sticks below the top edge, riding over the graffiti-wall background. Same
 * route-based nav + auth wiring as Theme7Header, restyled.
 */
export function Theme8Header({
  instagramUrl,
  tenantSlug,
  clientSlug,
  salonName,
  salonLogo,
}: Theme8HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoggedIn, isLoading } = useAuth();

  const base = tenantSlug ? `/${tenantSlug}` : "";
  const displayName = salonName ?? "The Lash Room by Anja";
  const logoSrc = salonLogo || "/images/theme-8/logo-byanja.svg";

  const showGallery = !!instagramUrl;
  const navItems: { name: string; href: string; external?: boolean }[] = [
    { name: "Naslovna", href: `${base}/` },
    { name: "Usluge", href: `${base}/usluge` },
    ...(showGallery
      ? [{ name: "Galerija", href: instagramUrl!, external: true }]
      : []),
    { name: "Blog", href: `${base}/blogs` },
  ];
  const bookHref = `${base}/termini`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-3 sm:top-4 z-[90] flex justify-center px-4 pointer-events-none">
      <nav
        className={`pointer-events-auto flex items-center gap-2 rounded-full border-[3px] border-y2k-ink bg-white/85 backdrop-blur-md px-2 py-2 pl-4 rotate-[-1deg] max-w-[96vw] transition-shadow duration-300 ${
          scrolled
            ? "shadow-[3px_4px_0_rgba(11,11,15,0.85)]"
            : "shadow-[5px_6px_0_rgba(11,11,15,0.85)]"
        }`}
      >
        <Link href={`${base}/`} className="flex items-center shrink-0">
          <Image
            src={logoSrc}
            alt={displayName}
            width={120}
            height={38}
            className="h-9 w-auto object-contain"
          />
        </Link>

        <div className="hidden md:flex items-center gap-1 mx-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              target={item.external ? "_blank" : "_self"}
              className="rounded-full px-3 py-1.5 text-[13px] font-bold tracking-[0.04em] text-y2k-ink hover:bg-y2k-pink/10 transition-colors"
            >
              {item.name}
            </Link>
          ))}
          {!isLoading &&
            (isLoggedIn ? (
              <LoggedButton user={user!} tenantSlug={clientSlug ?? tenantSlug} />
            ) : (
              <Link
                href={`${base}/login`}
                className="rounded-full px-3 py-1.5 text-[13px] font-bold tracking-[0.04em] text-y2k-ink hover:bg-y2k-pink/10 transition-colors"
              >
                Login
              </Link>
            ))}
        </div>

        <Link
          href={bookHref}
          className="group hidden sm:inline-flex items-center gap-1.5 rounded-full border-[3px] border-y2k-ink bg-y2k-pink px-4 py-2.5 text-[13px] font-extrabold uppercase tracking-[0.05em] text-white shadow-[3px_3px_0_#0b0b0f] hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#0b0b0f] transition-all duration-200"
        >
          BOOK <span aria-hidden>★</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden grid place-items-center h-10 w-10 rounded-full border-[3px] border-y2k-ink bg-white text-y2k-ink"
          aria-label="Otvori meni"
        >
          <Bars3Icon className="size-5" />
        </button>
      </nav>

      {/* Mobile drawer */}
      <Transition show={mobileMenuOpen} as={Dialog} onClose={setMobileMenuOpen}>
        <TransitionChild
          as="div"
          className="fixed inset-0 z-40"
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute inset-0 bg-y2k-plum/70 backdrop-blur-sm" />
        </TransitionChild>

        <TransitionChild
          as="div"
          className="fixed inset-y-0 right-0 z-50 w-full max-w-sm"
          enter="transform transition ease-in-out duration-300"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="transform transition ease-in-out duration-300"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
        >
          <DialogPanel className="relative h-full w-full bg-y2k-paper border-l-[4px] border-y2k-ink flex flex-col overflow-y-auto px-6 py-6 pointer-events-auto">
            <div className="flex items-center justify-between">
              <Image
                src={logoSrc}
                alt={displayName}
                width={120}
                height={38}
                className="h-9 w-auto object-contain"
              />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="grid place-items-center h-10 w-10 rounded-full border-[3px] border-y2k-ink bg-white text-y2k-ink"
                aria-label="Zatvori meni"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>

            <div className="mt-10 flex flex-col gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  target={item.external ? "_blank" : "_self"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-bagel text-3xl leading-none text-y2k-ink hover:text-y2k-pink transition-colors"
                >
                  {item.name}
                </Link>
              ))}
              {!isLoading &&
                (isLoggedIn ? (
                  <LoggedButton
                    user={user!}
                    tenantSlug={clientSlug ?? tenantSlug}
                    onCloseMobileMenu={() => setMobileMenuOpen(false)}
                  />
                ) : (
                  <Link
                    href={`${base}/login`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-bagel text-3xl leading-none text-y2k-ink hover:text-y2k-pink transition-colors"
                  >
                    Login
                  </Link>
                ))}
            </div>

            <Link
              href={bookHref}
              onClick={() => setMobileMenuOpen(false)}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-full border-[4px] border-y2k-ink bg-y2k-pink px-6 py-4 text-sm font-extrabold uppercase tracking-[0.05em] text-white shadow-[4px_4px_0_#0b0b0f]"
            >
              BOOK ★
            </Link>
          </DialogPanel>
        </TransitionChild>
      </Transition>
    </header>
  );
}
