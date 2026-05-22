/**
 * /auth/callback
 *
 * Međustrani za prenos tokena između domena.
 *
 * Flow:
 * 1. marysoll.com/login → korisnik se uloguje
 * 2. Login preusmeri na admin.marysoll.com/auth/callback?token=xxx&redirect=/dashboard
 * 3. Ova stranica uzme token iz URL-a, čuva u localStorage
 * 4. Preusmeri na ?redirect= destinaciju
 *
 * Zašto: localStorage je izolovan po domenu. Token sa marysoll.com
 * nije vidljiv na admin.marysoll.com, pa moramo da ga prenesemo eksplicitno.
 */
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const redirect = searchParams.get("redirect") ?? "/";

    if (token) {
      // Sačuvaj token u localStorage ovog domena (admin.marysoll.com)
      localStorage.setItem("token", decodeURIComponent(token));
    }

    // Odmah preusmeri na cilj — token je spreman
    router.replace(redirect);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Prijavljivanje...</p>
      </div>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
