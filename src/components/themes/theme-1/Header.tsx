"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import LoggedButton from "@/components/auth/LoggedButton";

interface Theme1HeaderProps {
  instagramUrl?: string;
  tenantSlug?: string;
  /** Real DB slug — always set, used for LoggedButton panel links */
  clientSlug?: string;
  salonName?: string;
  salonLogo?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
}

export function Theme1Header({
  instagramUrl,
  tenantSlug,
  salonName,
  salonLogo,
  clientSlug,
  primaryColor = "#a855f7",
  secondaryColor = "#ec4899",
}: Theme1HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoggedIn, isLoading } = useAuth();
  const pathname = usePathname();

  // Prefix for links — when in tenant context use /slug, else /
  const base = tenantSlug ? `/${tenantSlug}` : "";
  const showGallery = !!instagramUrl;

  const navItems = [
    { name: "Naslovna", href: `${base}/` },
    { name: "Usluge", href: `${base}/usluge` },
    ...(showGallery
      ? [{ name: "Galerija", href: instagramUrl!, external: true }]
      : []),
    { name: "Blog", href: `${base}/blogs` },
    { name: "Termini", href: `${base}/termini`, cta: true },
  ];

  if (isLoading) return null;

  const logoSrc = salonLogo;
  const displayName = salonName ?? "Salon";

  return (
    <header className="bg-transparent absolute w-full lg:w-7xl mx-auto inset-x-0 top-0 z-50">
      <nav className="flex items-center justify-between py-5 px-2 lg:px-0">
        <Link href={`${base}/`} className="flex items-center gap-2">
          {logoSrc ? (
            <div className="flex items-center">
              <Image
                src={logoSrc}
                alt={displayName}
                width={192}
                height={192}
                className="h-12 w-12 object-contain"
                preload={true}
              />
              <span className="ml-2 text-sm font-bold text-black">
                {displayName}
              </span>
            </div>
          ) : (
            <span className="text-xl font-bold text-black">{displayName}</span>
          )}
        </Link>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-2 rounded-lg bg-white/80 backdrop-blur"
        >
          <Bars3Icon className="size-5 text-gray-700" />
        </button>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive =
              !item.external &&
              (item.href === `${base}/`
                ? pathname === `${base}/` || pathname === base
                : pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                target={item.external ? "_blank" : "_self"}
                className={
                  item.cta
                    ? "px-5 py-2 bg-(--primary-color)/90 text-white text-sm font-semibold rounded-full hover:bg-(--primary-color) transition-colors"
                    : `text-sm font-medium transition-colors ${isActive ? "text-(--primary-color)" : "text-gray-700 hover:text-(--primary-color)"}`
                }
              >
                {item.name}
              </Link>
            );
          })}
          {!isLoggedIn ? (
            <Link
              href={`${base}/login`}
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2 rounded-full border border-gray-200 hover:border-gray-400 transition"
            >
              Prijava
            </Link>
          ) : (
            <LoggedButton user={user!} tenantSlug={clientSlug ?? tenantSlug} />
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      <Transition
        show={mobileMenuOpen}
        as={Dialog}
        onClose={setMobileMenuOpen}
        className="lg:hidden"
      >
        <TransitionChild
          as="div"
          className="fixed inset-0"
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute inset-0 bg-black/50 z-10" />
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
          <DialogPanel
            className="h-full bg-white px-6 py-6 shadow-2xl"
            style={
              {
                "--primary-color": primaryColor,
                "--secondary-color": secondaryColor,
              } as React.CSSProperties
            }
          >
            <div className="flex items-center justify-between mb-8">
              <span className="font-bold text-lg text-(--primary-color)">
                {displayName}
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 cursor-pointer"
              >
                <XMarkIcon className="size-5 text-(--primary-color) transition" />
              </button>
            </div>
            <div className="space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  target={item.external ? "_blank" : "_self"}
                  onClick={() => setMobileMenuOpen(false)}
                  className={
                    item.cta
                      ? "block text-center py-3 bg-(--primary-color) text-white font-semibold rounded-xl"
                      : "block py-2 text-gray-700 font-medium hover:text-(--primary-color)"
                  }
                >
                  {item.name}
                </Link>
              ))}
              {!isLoggedIn ? (
                <Link
                  href={`${base}/login`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-3 border border-gray-200 rounded-xl text-gray-700 font-medium"
                >
                  Prijava
                </Link>
              ) : (
                <LoggedButton
                  user={user!}
                  tenantSlug={tenantSlug}
                  onCloseMobileMenu={() => setMobileMenuOpen(false)}
                />
              )}
            </div>
          </DialogPanel>
        </TransitionChild>
      </Transition>
    </header>
  );
}
