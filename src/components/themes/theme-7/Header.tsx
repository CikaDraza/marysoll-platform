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

interface Theme7HeaderProps {
  instagramUrl?: string;
  tenantSlug?: string;
  /** Real DB slug — always set, used for LoggedButton panel links. */
  clientSlug?: string;
  salonName?: string;
  salonLogo?: string | null;
}

const underline =
  "relative hover:opacity-70 transition-opacity after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-current hover:after:w-full after:transition-all after:duration-300";

export function Theme7Header({
  instagramUrl,
  tenantSlug,
  clientSlug,
  salonName,
  salonLogo,
}: Theme7HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoggedIn, isLoading } = useAuth();

  const base = tenantSlug ? `/${tenantSlug}` : "";
  const displayName = salonName ?? "The Lash Room";
  const logoSrc = salonLogo || "/images/theme-7/logo.jpg";

  // Route-based nav, mirroring Theme-1's system. "Galerija" only appears when an
  // Instagram link exists; the special "/termini" CTA is the neon "Book now" pill.
  // Labels are hardcoded fallbacks (not yet CMS-driven).
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
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header>
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-colors duration-500 ${
          scrolled
            ? "bg-paper/85 backdrop-blur-md text-ink shadow-[0_1px_0_rgba(0,0,0,0.06)]"
            : "bg-transparent text-cream"
        }`}
      >
        <div className="max-w-[1320px] mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-3 group">
            <Image
              src={logoSrc}
              alt={displayName}
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg object-cover ring-1 ring-white/20 group-hover:scale-105 transition-transform duration-300"
            />
            <span className="font-cormorant text-xl tracking-tight leading-none">
              {displayName}
            </span>
          </a>

          <div className="hidden lg:flex items-center gap-9 text-[13px] uppercase tracking-[0.18em] font-medium">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                target={item.external ? "_blank" : "_self"}
                className={underline}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {!isLoading &&
              (isLoggedIn ? (
                <div className="hidden sm:block">
                  <LoggedButton
                    user={user!}
                    tenantSlug={clientSlug ?? tenantSlug}
                  />
                </div>
              ) : (
                <Link
                  href={`${base}/login`}
                  className="hidden sm:inline text-[12px] uppercase tracking-[0.18em] font-medium hover:text-neon transition-colors"
                >
                  Prijava
                </Link>
              ))}
            <Link
              href={bookHref}
              className="group hidden sm:inline-flex items-center gap-2 rounded-full bg-neon px-5 py-2.5 text-[12px] uppercase tracking-[0.18em] font-medium text-white shadow-[0_8px_30px_-8px_#ff2e88] hover:shadow-[0_12px_40px_-6px_#ff2e88] hover:-translate-y-0.5 transition-all duration-300"
            >
              Book now
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -mr-2"
              aria-label="Otvori meni"
            >
              <Bars3Icon className="size-6" />
            </button>
          </div>
        </div>

        {/* Mobile drawer — full-screen slide-over from the right */}
        <Transition
          show={mobileMenuOpen}
          as={Dialog}
          onClose={setMobileMenuOpen}
          className="lg:hidden"
        >
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
            <div className="absolute inset-0 bg-black/60" />
          </TransitionChild>

          <TransitionChild
            as="div"
            className="fixed inset-y-0 right-0 z-50 w-full"
            enter="transform transition ease-in-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transform transition ease-in-out duration-300"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <DialogPanel className="relative h-full w-full bg-ink text-cream flex flex-col overflow-y-auto px-6 py-6">
              {/* Drawer glow */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_100%_0%,#ff2e8833_0%,#ff2e8800_60%)]" />

              <div className="relative flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <Image
                    src={logoSrc}
                    alt={displayName}
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-lg object-cover"
                  />
                  <span className="font-cormorant text-xl leading-none">
                    {displayName}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 -mr-2 hover:text-neon transition-colors"
                  aria-label="Zatvori meni"
                >
                  <XMarkIcon className="size-6" />
                </button>
              </div>

              <div className="relative mt-12 flex flex-col gap-6">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    target={item.external ? "_blank" : "_self"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-cormorant text-4xl leading-none hover:text-neon transition-colors"
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
                      className="block text-center rounded-full border border-cream/25 px-6 py-3.5 text-[13px] uppercase tracking-[0.18em] font-medium hover:border-neon hover:text-neon transition-colors"
                    >
                      Prijava
                    </Link>
                  ))}
              </div>

              <div className="relative mt-auto pt-10 space-y-4">
                <Link
                  href={bookHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="group flex items-center justify-center gap-2 rounded-full bg-neon px-6 py-3.5 text-[13px] uppercase tracking-[0.18em] font-medium text-white shadow-[0_12px_40px_-10px_#ff2e88] transition-all duration-300"
                >
                  Book now
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                    &rarr;
                  </span>
                </Link>
              </div>
            </DialogPanel>
          </TransitionChild>
        </Transition>
      </nav>
    </header>
  );
}
