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
  clientSlug?: string;
  salonName?: string;
  salonLogo?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
}

export function Theme3Header({
  instagramUrl,
  tenantSlug,
  salonName,
  salonLogo,
  clientSlug,
  primaryColor = "#a855f7",
  secondaryColor = "#ec4899",
}: Props) {
  const [open, setOpen] = useState(false);
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
    <header className="fixed inset-x-0 top-0 z-50 bg-[#FAF8F5]/95 backdrop-blur border-b border-[#E8E0D5]">
      <nav className="flex items-center justify-between max-w-7xl mx-auto px-6 py-4">
        <Link href={`${base}/`} className="flex items-center gap-3">
          {salonLogo ? (
            <Image
              src={salonLogo}
              alt={displayName}
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          ) : (
            <span className="text-base font-semibold text-[#5C4033] tracking-wide">
              {displayName}
            </span>
          )}
        </Link>

        <button
          onClick={() => setOpen(true)}
          className="lg:hidden p-2 text-[#9E7E6E]"
        >
          <Bars3Icon className="size-5" />
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
                    ? "px-5 py-2 bg-[#C9A990] text-white text-sm font-medium rounded-full hover:bg-[#B8957A] transition"
                    : `text-sm transition ${active ? "text-[#C9A990] font-medium" : "text-[#7C6A5E] hover:text-[#5C4033]"}`
                }
              >
                {item.name}
              </Link>
            );
          })}
          {!isLoggedIn ? (
            <Link
              href={`${base}/login`}
              className="text-sm text-[#9E7E6E] hover:text-[#5C4033] border border-[#E0D0C5] px-4 py-2 rounded-full transition"
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
        show={open}
        as={Dialog}
        onClose={setOpen}
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
            className="h-full bg-[#FAF8F5] px-6 py-6 shadow-2xl"
            style={
              {
                "--primary-color": primaryColor,
                "--secondary-color": secondaryColor,
              } as React.CSSProperties
            }
          >
            <div className="flex items-center justify-between mb-8">
              <span className="font-semibold text-[#5C4033]">
                {displayName}
              </span>
              <button onClick={() => setOpen(false)} className="cursor-pointer">
                <XMarkIcon className="size-5 text-[#9E7E6E]" />
              </button>
            </div>
            <div className="space-y-3">
              {nav.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  target={item.external ? "_blank" : "_self"}
                  onClick={() => setOpen(false)}
                  className={
                    item.cta
                      ? "block text-center py-3 bg-(--primary-color) text-white font-medium rounded-full text-sm"
                      : "block py-2 text-[#7C6A5E] hover:text-[#5C4033] text-sm"
                  }
                >
                  {item.name}
                </Link>
              ))}
              {!isLoggedIn ? (
                <Link
                  href={`${base}/login`}
                  onClick={() => setOpen(false)}
                  className="block text-center py-2 border border-[#E0D0C5] text-[#9E7E6E] rounded-full text-sm"
                >
                  Prijava
                </Link>
              ) : (
                <LoggedButton
                  user={user!}
                  tenantSlug={clientSlug ?? tenantSlug}
                  onCloseMobileMenu={() => setOpen(false)}
                />
              )}
            </div>
          </DialogPanel>
        </TransitionChild>
      </Transition>
    </header>
  );
}
