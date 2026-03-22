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

export function Theme3Header({ instagramUrl, tenantSlug, salonName, salonLogo }: Props) {
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
    <header className="fixed inset-x-0 top-0 z-50 bg-[#FAF8F5]/95 backdrop-blur border-b border-[#E8E0D5]">
      <nav className="flex items-center justify-between max-w-6xl mx-auto px-6 py-4">
        <Link href={`${base}/`} className="flex items-center gap-3">
          {salonLogo
            ? <Image src={salonLogo} alt={displayName} width={120} height={40} className="h-10 w-auto" />
            : <span className="text-base font-semibold text-[#5C4033] tracking-wide">{displayName}</span>
          }
        </Link>

        <button onClick={() => setOpen(true)} className="lg:hidden p-2 text-[#9E7E6E]">
          <Bars3Icon className="size-5" />
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
                  ? "px-5 py-2 bg-[#C9A990] text-white text-sm font-medium rounded-full hover:bg-[#B8957A] transition"
                  : `text-sm transition ${active ? "text-[#C9A990] font-medium" : "text-[#7C6A5E] hover:text-[#5C4033]"}`
                }>{item.name}</Link>
            );
          })}
          {!isLoggedIn
            ? <Link href={`${base}/login`} className="text-sm text-[#9E7E6E] hover:text-[#5C4033] border border-[#E0D0C5] px-4 py-2 rounded-full transition">Prijava</Link>
            : <LoggedButton user={user!} tenantSlug={tenantSlug} />
          }
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-[#FAF8F5] border-l border-[#E8E0D5] p-6">
            <div className="flex items-center justify-between mb-8">
              <span className="text-[#5C4033] font-semibold">{displayName}</span>
              <button onClick={() => setOpen(false)}><XMarkIcon className="size-5 text-[#9E7E6E]" /></button>
            </div>
            <div className="space-y-3">
              {nav.map(item => (
                <Link key={item.name} href={item.href} target={item.external ? "_blank" : "_self"} onClick={() => setOpen(false)}
                  className={item.cta ? "block text-center py-3 bg-[#C9A990] text-white font-medium rounded-full text-sm" : "block py-2 text-[#7C6A5E] hover:text-[#5C4033] text-sm"}>
                  {item.name}
                </Link>
              ))}
              {!isLoggedIn
                ? <Link href={`${base}/login`} onClick={() => setOpen(false)} className="block text-center py-2 border border-[#E0D0C5] text-[#9E7E6E] rounded-full text-sm">Prijava</Link>
                : <LoggedButton user={user!} tenantSlug={tenantSlug} onCloseMobileMenu={() => setOpen(false)} />
              }
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
