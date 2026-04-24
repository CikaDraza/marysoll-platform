"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import LoggedButton from "@/components/auth/LoggedButton";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";

interface Props {
  instagramUrl?: string;
  tenantSlug?: string;
  /** Real DB slug — always set, used for LoggedButton panel links */
  clientSlug?: string;
  salonName?: string;
  salonLogo?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
}

export function Theme2Header({
  instagramUrl,
  tenantSlug,
  salonName,
  salonLogo,
  clientSlug,
  primaryColor = "#a855f7",
  secondaryColor = "#ec4899",
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoggedIn, isLoading } = useAuth();
  const pathname = usePathname();
  const showGallery = !!instagramUrl;
  const base = tenantSlug ? `/${tenantSlug}` : "";
  const displayName = salonName ?? "Salon";

  const nav = [
    { name: "Naslovna", href: `${base}/` },
    { name: "Usluge", href: `${base}/usluge` },
    ...(showGallery
      ? [{ name: "Galerija", href: instagramUrl!, external: true }]
      : []),
    { name: "Termini", href: `${base}/termini`, cta: true },
  ];

  if (isLoading) return null;

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-gray-950/80 backdrop-blur">
      <nav className="flex items-center justify-between max-w-7xl mx-auto px-6 py-4">
        <Link href={`${base}/`} className="flex items-center gap-3">
          {salonLogo ? (
            <Image
              src={salonLogo}
              alt={displayName}
              width={120}
              height={40}
              className="h-10 w-auto brightness-110"
            />
          ) : (
            <span className="text-lg font-bold text-yellow-400 tracking-widest uppercase">
              {displayName}
            </span>
          )}
        </Link>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-2 text-gray-300 hover:text-yellow-400"
        >
          <Bars3Icon className="size-6" />
        </button>

        <div className="hidden lg:flex items-center gap-8">
          {nav.map((item) => {
            const active =
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
                    ? "px-5 py-2 bg-yellow-500 text-gray-950 text-sm font-bold rounded tracking-wide hover:bg-yellow-400 transition"
                    : `text-sm font-medium tracking-wide transition ${active ? "text-yellow-400" : "text-gray-300 hover:text-white"}`
                }
              >
                {item.name}
              </Link>
            );
          })}
          {!isLoggedIn ? (
            <Link
              href={`${base}/login`}
              className="text-sm text-gray-400 hover:text-white border border-gray-700 px-4 py-2 rounded hover:border-yellow-500 transition"
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
              {nav.map((item) => (
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
