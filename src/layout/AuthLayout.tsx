/**
 * AuthLayout — two-column layout za login/register stranice.
 *
 * Lijeva kolona: branding ilustracija + feature bullets
 * Desna kolona: form (children)
 *
 * Responsive: na mobilnom samo desna kolona (form)
 */
import React from "react";
import Link from "next/link";
import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
  heading: string;
  subheading: string;
  footerText: string;
  footerLinkText: string;
  footerLinkHref: string;
}

// ─── Left panel illustration (server component — no JS) ──────────────────────

function LeftPanel() {
  const features = [
    { icon: "✂️", text: "Online zakazivanje termina" },
    { icon: "📊", text: "Statistika i analitika salona" },
    { icon: "📧", text: "Newsletter kampanje za klijente" },
    { icon: "🗓️", text: "Kalendar i upravljanje osobljem" },
    { icon: "🔔", text: "Automatske notifikacije" },
    { icon: "🌐", text: "Vaš salon online — vaš domen" },
  ];

  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-950 flex-col justify-between p-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large circle top-right */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
        {/* Small circle bottom-left */}
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-purple-500/20 blur-2xl" />
        {/* Grid dots */}
        <svg
          className="absolute inset-0 w-full h-full opacity-5"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="dots"
              x="0"
              y="0"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      {/* Logo */}
      <div className="relative z-10">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/marysoll_elegant_logo.png"
            alt="Marysoll logo"
            width={40}
            height={40}
            className="rounded-2xl"
          />
          <span className="text-xl font-bold text-white">Marysoll</span>
        </Link>
        <p className="text-violet-300 text-sm mt-1 ml-1">
          Beauty salon platforma
        </p>
      </div>

      {/* Center content */}
      <div className="relative z-10 space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-white leading-tight">
            Sve što vaš salon
            <br />
            <span className="text-violet-300">treba na jednom mestu</span>
          </h2>
          <p className="text-violet-300/80 text-sm mt-3 leading-relaxed max-w-sm">
            Moderan softver za beauty salone — od zakazivanja do marketinga, sve
            u jednoj platformi.
          </p>
        </div>

        <ul className="space-y-3">
          {features.map((f) => (
            <li key={f.text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-sm flex-shrink-0">
                {f.icon}
              </div>
              <span className="text-sm text-white/80 font-medium">
                {f.text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom testimonial */}
      <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            A
          </div>
          <div>
            <p className="text-sm text-white/90 leading-relaxed">
              &quot;Marysoll mi je promenio način rada. Klijenti sami zakazuju,
              ja se fokusiram na posao.&quot;
            </p>
            <p className="text-xs text-violet-400 mt-2 font-semibold">
              Ana M. — Nail Studio Beograd
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AuthLayout ───────────────────────────────────────────────────────────────

export default function AuthLayout({
  children,
  heading,
  subheading,
  footerText,
  footerLinkText,
  footerLinkHref,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Left — illustration */}
      <LeftPanel />

      {/* Right — form */}
      <div className="flex-1 lg:w-1/2 flex flex-col min-h-screen">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white font-black text-sm shadow">
              M
            </div>
            <span className="font-bold text-gray-900 dark:text-white">
              Marysoll
            </span>
          </Link>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {footerText}{" "}
            <Link
              href={footerLinkHref}
              className="text-violet-600 dark:text-violet-400 font-semibold hover:underline"
            >
              {footerLinkText}
            </Link>
          </p>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-16">
          <div className="w-full max-w-md">
            {/* Heading */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {heading}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {subheading}
              </p>
            </div>

            {/* Form children */}
            {children}

            {/* Footer link */}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
              {footerText}{" "}
              <Link
                href={footerLinkHref}
                className="text-violet-600 dark:text-violet-400 font-semibold hover:underline"
              >
                {footerLinkText}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
