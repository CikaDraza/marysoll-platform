"use client";

import { useAuth } from "@/hooks/useAuth";
import { shortDisplayName } from "@/lib/displayName";
import { useClientRouting } from "@/hooks/useClientRouting";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

interface User {
  name?: string;
  isAdmin?: boolean;
}

interface LoggedButtonProps {
  user: User | null;
  onCloseMobileMenu?: () => void;
  /**
   * tenantSlug — wenn gesetzt, werden Links zum Klienten-Panel
   * relativ zum Salon-Subdomain (/[tenantSlug]/panel) gebaut.
   * Wenn nicht gesetzt, werden globale /dashboard Links verwendet.
   */
  tenantSlug?: string;
  color?: string;
  backgroundColor?: string;
}

export default function LoggedButton({
  user,
  onCloseMobileMenu,
  tenantSlug,
  color,
  backgroundColor,
}: LoggedButtonProps) {
  const { logout } = useAuth();
  // useClientRouting gives the correct base ("" or "/slug") AND the real tenant
  // slug from context (set on every tenant page). We fall back to that slug when
  // the `tenantSlug` prop isn't threaded through — e.g. Usluge/Termini/Blog whose
  // header comes via TenantPageShell — so the panel links render there too, not
  // only on the home page.
  const { base, tenantSlug: ctxSlug } = useClientRouting();
  const slug = tenantSlug || ctxSlug;

  const handleMenuItemClick = () => {
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  if (!user) {
    // On custom domain base is "", so loginHref becomes "/login" — correct.
    // On path-based base is "/kiki-makeup", so loginHref is "/kiki-makeup/login".
    const loginHref = slug ? `${base}/login` : "/login";
    return (
      <Link
        href={loginHref}
        className={`px-4 py-2 rounded-lg ${backgroundColor ? `border-[${backgroundColor}]` : "bg-black"} ${backgroundColor ? `bg-[${backgroundColor}]` : "bg-black"} ${color ? `text-[${color}]` : "text-white"} text-sm font-semibold ${backgroundColor ? `hover:bg-[${backgroundColor}]` : "hover:bg-black"} transition`}
        onClick={onCloseMobileMenu}
      >
        Prijavi se
      </Link>
    );
  }

  // ── Linkovi zavisno od konteksta ─────────────────────────────────────────
  //
  // tenantSlug je uvijek postavljen kada je LoggedButton na salon stranici
  // (i path-based i custom domain — Header proslijeđuje clientSlug koji je
  // uvijek pravi DB slug).
  //
  // Bez tenantSlug: korisnik je na admin.marysoll.com (admin) ili
  // marketing stranici — prikazujemo admin linkove ako isAdmin=true,
  // inače ništa (klijent ne bi trebao biti ovdje bez tenantSlug).

  // On custom domain (kikikiss.beauty): base="" → links are /panel, /login etc.
  // On path-based (marysoll.com/kiki-makeup): base="/kiki-makeup" → links are /kiki-makeup/panel etc.
  // Next.js Link does client-side navigation — middleware rewrites only run server-side,
  // so we must emit the correct URL that the browser should show, not the internal rewrite target.
  const clientPanelLinks = slug
    ? [
        { label: "Moji termini", href: `${base}/panel?tab=Moji+Termini` },
        { label: "Zakazivanja", href: `${base}/panel?tab=Zakazivanja` },
        { label: "Moje preporuke", href: `${base}/panel?tab=Moje+Preporuke` },
        { label: "Notifikacije", href: `${base}/panel?tab=Notifikacije` },
        { label: "Moj profil", href: `${base}/panel?tab=Moj+Profil` },
      ]
    : [];

  // Admin dashboard linkovi — samo na admin.marysoll.com (bez tenantSlug)
  const adminLinks =
    !slug && user.isAdmin
      ? [
          { label: "Svi Termini", href: "/dashboard?tab=Svi Termini" },
          { label: "Klijenti", href: "/dashboard?tab=Klijenti" },
          {
            label: "Preporuke Klijenata",
            href: "/dashboard?tab=Preporuke Klijenata",
          },
          { label: "Zakazivanja", href: "/dashboard?tab=Zakazivanja" },
          { label: "Usluge", href: "/dashboard?tab=Usluge" },
          { label: "Statistika", href: "/dashboard?tab=Statistika" },
          { label: "Profil Salona", href: "/dashboard?tab=Salon Profil" },
          {
            label: "Newsletter Kampanja",
            href: "/dashboard?tab=Newsletter Kampanja",
          },
        ]
      : [];

  // Logika izbora linkova:
  // - Na salon stranici (tenantSlug postoji) → uvijek klijentski panel linkovi
  // - Na admin domenu (bez tenantSlug, isAdmin) → admin linkovi
  // - Klijent bez tenantSlug → ne prikazujemo ništa (edge case, ne bi trebalo)
  const menuLinks = slug
    ? clientPanelLinks
    : user.isAdmin
      ? adminLinks
      : [];

  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton
        style={{
          color: color || "#fff",
          backgroundColor: backgroundColor || "#000000",
        }}
        className={`inline-flex items-center gap-x-1.5 rounded-md px-3 py-2 text-xs 2xl:text-sm font-semibold focus:outline-none focus:ring-offset-2 focus:ring-offset-white`}
      >
        <span className="max-w-[14ch] truncate">
          {shortDisplayName(user.name) || "Korisnik"}
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-gray-500"
        />
      </MenuButton>

      <MenuItems
        transition
        className="absolute lg:right-0 z-50 mt-2 w-52 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-gray-200 focus:outline-none divide-y divide-gray-100"
      >
        {/* Name badge */}
        <div className="px-4 py-2.5">
          <p className="text-xs text-gray-400">Prijavljeni ste kao</p>
          <p className="text-sm font-semibold text-gray-800 truncate">
            {user.name}
          </p>
        </div>

        {/* Links */}
        {menuLinks.length > 0 && (
          <div className="py-1">
            {menuLinks.map((item) => (
              <MenuItem key={item.label}>
                <Link
                  href={item.href}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                  onClick={handleMenuItemClick}
                >
                  {item.label}
                </Link>
              </MenuItem>
            ))}
          </div>
        )}

        {/* Logout */}
        <div className="py-1">
          <MenuItem>
            <button
              onClick={() => {
                logout({ tenantSlug: slug || undefined });
                if (onCloseMobileMenu) onCloseMobileMenu();
              }}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Odjavi se
            </button>
          </MenuItem>
        </div>
      </MenuItems>
    </Menu>
  );
}
