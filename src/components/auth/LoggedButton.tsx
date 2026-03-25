"use client";

import { useAuth } from "@/hooks/useAuth";
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
}

export default function LoggedButton({
  user,
  onCloseMobileMenu,
  tenantSlug,
}: LoggedButtonProps) {
  const { logout } = useAuth();

  const handleMenuItemClick = () => {
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  if (!user) {
    const loginHref = tenantSlug ? `/${tenantSlug}/login` : "/login";
    return (
      <Link
        href={loginHref}
        className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800"
        onClick={onCloseMobileMenu}
      >
        Prijavi se
      </Link>
    );
  }

  // ── Klijentski panel linkovi (unutar salona) ──────────────────────────────
  const clientPanelLinks = tenantSlug
    ? [
        {
          label: "Moji termini",
          href: `/${tenantSlug}/panel?tab=Moji+Termini`,
        },
        { label: "Zakazivanja", href: `/${tenantSlug}/panel?tab=Zakazivanja` },
        {
          label: "Moje preporuke",
          href: `/${tenantSlug}/panel?tab=Moje+Preporuke`,
        },
        {
          label: "Notifikacije",
          href: `/${tenantSlug}/panel?tab=Notifikacije`,
        },
        { label: "Moj profil", href: `/${tenantSlug}/panel?tab=Moj+Profil` },
      ]
    : [];

  // ── Admin linkovi (globalni dashboard) ────────────────────────────────────
  const adminLinks =
    !tenantSlug && user.isAdmin
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

  // ── Globalni klijentski linkovi (bez tenantSlug) ─────────────────────────
  const globalClientLinks =
    !tenantSlug && !user.isAdmin
      ? [
          { label: "Moji Termini", href: "/dashboard?tab=Moji Termini" },
          { label: "Zakazivanja", href: "/dashboard?tab=Zakazivanja" },
          { label: "Moje Preporuke", href: "/dashboard?tab=Moje Preporuke" },
        ]
      : [];

  const menuLinks = tenantSlug
    ? clientPanelLinks
    : user.isAdmin
      ? adminLinks
      : globalClientLinks;

  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton className="inline-flex items-center gap-x-1.5 rounded-md bg-black px-3 py-2 text-xs 2xl:text-sm font-semibold text-white hover:bg-gray-800">
        {user.name ?? "Korisnik"}
        <ChevronDownIcon aria-hidden="true" className="size-4 text-gray-400" />
      </MenuButton>

      <MenuItems
        transition
        className="absolute right-0 z-50 mt-2 w-52 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-gray-200 focus:outline-none divide-y divide-gray-100"
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
                logout({ tenantSlug });
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
