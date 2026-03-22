"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import LoggedButton from "@/components/auth/LoggedButton";

interface Props {
  instagramUrl?: string;
  tenantSlug?: string;
  salonName?: string;
  salonLogo?: string | null;
}

export function Theme2Header({ instagramUrl, tenantSlug, salonName, salonLogo }: Props) {
  const [open, setOpen] = useState(false);
  const { user, isLoggedIn, isLoading } = useAuth();
  const pathname = usePathname();
  const showGallery = !!instagramUrl;
  const base = tenantSlug ? `/${tenantSlug}` : "";
  const displayName = salonName ?? "Salon";

  const nav = [
    { name: "Naslovna", href: `${base}/` },
    { name: "Usluge", href: `${base}/usluge` },
    ...(showGallery ? [{ name: "Galerija", href: instagramUrl!, external: true }] : []),
    { name: "Termini", href: `${base}/termini`, cta: true },
  ];

  if (isLoading) return null;

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-gray-950/95 backdrop-blur border-b border-yellow-900/30">
      <nav className="flex items-center justify-between max-w-7xl mx-auto px-6 py-4">
        <Link href={`${base}/`} className="flex items-center gap-3">
          {salonLogo
            ? <Image src={salonLogo} alt={displayName} width={120} height={40} className="h-10 w-auto brightness-110" />
            : <span className="text-lg font-bold text-yellow-400 tracking-widest uppercase">{displayName}</span>
          }
        </Link>

        <button onClick={() => setOpen(true)} className="lg:hidden p-2 text-gray-300 hover:text-yellow-400">
          <Bars3Icon className="size-6" />
        </button>

        <div className="hidden lg:flex items-center gap-8">
          {nav.map(item => {
            const active = !item.external && (
              item.href === `${base}/`
                ? pathname === `${base}/` || pathname === base
                : pathname.startsWith(item.href)
            );
            return (
              <Link key={item.name} href={item.href} target={item.external ? "_blank" : "_self"}
                className={item.cta
                  ? "px-5 py-2 bg-yellow-500 text-gray-950 text-sm font-bold rounded tracking-wide hover:bg-yellow-400 transition"
                  : `text-sm font-medium tracking-wide transition ${active ? "text-yellow-400" : "text-gray-300 hover:text-white"}`
                }>{item.name}</Link>
            );
          })}
          {!isLoggedIn
            ? <Link href={`${base}/login`} className="text-sm text-gray-400 hover:text-white border border-gray-700 px-4 py-2 rounded hover:border-yellow-500 transition">Prijava</Link>
            : <LoggedButton user={user!} tenantSlug={tenantSlug} />
          }
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-gray-950 border-l border-yellow-900/30 p-6">
            <div className="flex items-center justify-between mb-8">
              <span className="text-yellow-400 font-bold">{displayName}</span>
              <button onClick={() => setOpen(false)}><XMarkIcon className="size-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              {nav.map(item => (
                <Link key={item.name} href={item.href} target={item.external ? "_blank" : "_self"} onClick={() => setOpen(false)}
                  className={item.cta ? "block text-center py-3 bg-yellow-500 text-gray-950 font-bold rounded" : "block py-2 text-gray-300 hover:text-white"}>
                  {item.name}
                </Link>
              ))}
              {!isLoggedIn
                ? <Link href={`${base}/login`} onClick={() => setOpen(false)} className="block text-center py-2 border border-gray-700 text-gray-400 rounded">Prijava</Link>
                : <LoggedButton user={user!} tenantSlug={tenantSlug} onCloseMobileMenu={() => setOpen(false)} />
              }
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
