"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface NavItem {
  label: string;
  href: string;
}

interface CTA {
  label: string;
  href: string;
}

interface Props {
  salonName?: string;
  logo?: string;
  navigation?: NavItem[];
  cta?: CTA;
}

export function Theme6Header({
  salonName = "Elegance Nails",
  logo,
  navigation = [
    { label: "Home", href: "#" },
    { label: "Services", href: "#services" },
    { label: "Portfolio", href: "#portfolio" },
    { label: "Team", href: "#team" },
    { label: "Contact", href: "#contact" },
  ],
  cta = { label: "Book Now", href: "#booking" },
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E5E0DB]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            {logo ? (
              <Image
                width={64}
                height={64}
                src={logo}
                alt={salonName}
                className="h-8 w-auto"
              />
            ) : (
              <span className="text-xl font-light tracking-wide text-[#2A2825]">
                {salonName}
              </span>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-light tracking-wide text-[#2A2825] hover:text-[#C4A595] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link
              href={cta.href}
              className="px-6 py-2.5 bg-[#C4A595] text-white text-sm font-light tracking-wide hover:opacity-90 transition-opacity"
            >
              {cta.label}
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#2A2825]"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5E0DB] bg-white">
          <nav className="px-6 py-6 flex flex-col gap-4">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-light tracking-wide text-[#2A2825] hover:text-[#C4A595] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={cta.href}
              className="mt-4 px-6 py-2.5 bg-[#C4A595] text-white text-sm font-light tracking-wide text-center hover:opacity-90 transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            >
              {cta.label}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
