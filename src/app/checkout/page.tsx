"use client";

/**
 * /checkout — hosted checkout landing.
 *
 * Korisnik se ovde preusmerava nakon kreiranja Paddle transakcije
 * (POST /api/paddle/checkout → transaction.checkout.url). Paddle dodaje
 * `_ptxn=txn_…` na URL. Ova stranica inicijalizuje Paddle.js i otvara
 * checkout za tu transakciju. Po uspehu vraća na `returnTo` (dashboard).
 *
 * Ovo je ujedno "Default Payment Link" koji se podešava u Paddle dashboardu.
 */

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckoutEventNames } from "@paddle/paddle-js";
import { getPaddle } from "@/lib/paddleClient";

/** Dodaje query param na URL bez obzira ima li već `?`. */
function withParam(url: string, key: string, value: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}${key}=${value}`;
}

function CheckoutInner() {
  const searchParams = useSearchParams();
  const [openError, setOpenError] = useState<string | null>(null);
  // Sprečava dupli redirect kad completed→successUrl i closed stignu jedan za drugim.
  const settledRef = useRef(false);

  const transactionId =
    searchParams.get("_ptxn") ?? searchParams.get("transactionId");
  const returnTo = searchParams.get("returnTo");

  useEffect(() => {
    if (!transactionId) return;

    let cancelled = false;

    // Baza povratka = dashboard Pretplata (bez ikakvog flag-a). successUrl dodaje
    // `checkout=success` (to AdminPlanStatus čita), a cancel vraća BEZ tog flag-a.
    const base =
      returnTo ?? `${window.location.origin}/dashboard?tab=pretplata`;
    const successUrl = withParam(base, "checkout", "success");
    const cancelUrl = withParam(base, "checkout", "cancelled");

    (async () => {
      try {
        // eventCallback: korisnik zatvori overlay (X) bez plaćanja → vrati ga na
        // dashboard umesto da ostane zaglavljen na spineru.
        const paddle = await getPaddle((event) => {
          if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
            settledRef.current = true; // successUrl preuzima navigaciju
          } else if (event.name === CheckoutEventNames.CHECKOUT_CLOSED) {
            if (settledRef.current) return;
            settledRef.current = true;
            window.location.assign(cancelUrl);
          }
        });
        if (cancelled) return;
        if (!paddle) {
          setOpenError("Paddle nije mogao da se inicijalizuje.");
          return;
        }

        paddle.Checkout.open({
          transactionId,
          settings: { displayMode: "overlay", successUrl },
        });
      } catch (err) {
        console.error("[CHECKOUT] open error:", err);
        if (!cancelled) setOpenError("Greška pri otvaranju checkout-a.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [transactionId, returnTo]);

  const error = !transactionId
    ? "Nedostaje ID transakcije. Pokušajte ponovo iz dashboarda."
    : openError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white font-black text-lg shadow-lg">
          M
        </div>
        {error ? (
          <p className="text-sm text-red-500 max-w-sm">{error}</p>
        ) : (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
            Otvaramo bezbedan checkout...
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutInner />
    </Suspense>
  );
}
