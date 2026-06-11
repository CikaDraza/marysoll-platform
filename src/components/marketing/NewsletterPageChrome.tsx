// components/marketing/NewsletterPageChrome.tsx
//
// Compact header + footer wrapping public newsletter landing pages
// (newsletter/[slug]) so the AI-generated campaign content sits inside
// consistent MarySoll platform chrome instead of floating on a bare page.

import Link from "next/link";
import Image from "next/image";

export function NewsletterMiniHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/marysoll_elegant_logo.png"
            alt="Marysoll logo"
            width={192}
            height={192}
            className="h-9 w-9 object-contain"
            priority
          />
          <span className="heading-font text-lg text-gray-900">Marysoll</span>
        </Link>
        <Link
          href="/register"
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          Probaj besplatno
        </Link>
      </div>
    </header>
  );
}

export function NewsletterMiniFooter() {
  return (
    <footer className="bg-gray-900 py-10 text-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/marysoll_elegant_logo.png"
            alt="Marysoll logo"
            width={192}
            height={192}
            className="h-8 w-8 object-contain"
          />
          <span className="heading-font text-white">Marysoll</span>
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
          <Link href="/pricing" className="transition hover:text-white">
            Cenovnik
          </Link>
          <Link href="/privacy" className="transition hover:text-white">
            Privacy
          </Link>
          <Link
            href="/terms-and-conditions"
            className="transition hover:text-white"
          >
            Terms
          </Link>
          <Link href="/kontakt" className="transition hover:text-white">
            Kontakt
          </Link>
        </nav>
      </div>

      <div className="mt-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} MarySoll. Tvoja drugarica iz salona. 💜
      </div>
    </footer>
  );
}
