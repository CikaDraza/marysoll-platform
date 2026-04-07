"use client";

import { useCookieConsent } from "@/hooks/useCookieConsent";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Props {
  /** tenantSlug is used to build the cookie-policy link */
  tenantSlug?: string;
}

export function CookiesModal({ tenantSlug }: Props) {
  const { consent, ready, acceptAll, acceptSelected, declineAll } =
    useCookieConsent();
  const [open, setOpen] = useState(false);
  const [tmp, setTmp] = useState({ functional: false, analytics: false });

  // Sync checkbox state with current consent when dialog opens
  useEffect(() => {
    async function loadConsent() {
      if (open && consent) {
        setTmp({
          functional: consent.functional,
          analytics: consent.analytics,
        });
      }
    }
    loadConsent();
  }, [open, consent]);

  // Auto-open dialog on first visit (no cookie_consent_v1 in localStorage)
  useEffect(() => {
    if (ready && !consent) {
      setOpen(true);
    }
  }, [ready, consent]);

  // Listen for custom event to open preferences dialog (e.g. from cookie-policy page)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-cookie-preferences", handler);
    return () => window.removeEventListener("open-cookie-preferences", handler);
  }, []);

  // Open when navigating to #open-preferences hash
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === "#open-preferences") {
        setOpen(true);
        window.history.replaceState(
          {},
          "",
          window.location.pathname + window.location.search,
        );
      }
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  // Don't render until localStorage is read
  if (!ready) return null;

  const cookiePolicyHref = tenantSlug
    ? `/${tenantSlug}/cookie-policy`
    : "/cookie-policy";

  return (
    <>
      {/* Banner — shown only before the user has decided */}
      {!consent?.decided && (
        <div className="fixed left-0 bottom-6 z-50">
          <div className="absolute w-xs lg:w-xl h-full z-50 flex items-end justify-center p-4">
            <div className="w-full rounded-xl bg-white shadow-xl">
              <div className="px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 items-center justify-center shrink-0 rounded-full bg-yellow-100">
                    <ExclamationTriangleIcon className="size-6 text-yellow-600" />
                  </div>
                  <div>
                    <h2 className="text-xl! font-semibold text-gray-900">
                      Koristimo kolačiće
                    </h2>
                    <p className="mt-2 text-xs text-gray-600">
                      Koristimo neophodne kolačiće za rad sajta. Možete izabrati
                      da uključite funkcionalne i analitičke kolačiće.
                    </p>
                    <Link
                      href={cookiePolicyHref}
                      className="mt-2 block text-sm text-(--secondary-color) hover:underline"
                    >
                      Pročitajte više
                    </Link>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex flex-col lg:flex-row justify-end gap-3 rounded-b-xl">
                <button
                  onClick={acceptAll}
                  className="cursor-pointer rounded-md bg-(--secondary-color) px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-(--secondary-color)/85"
                >
                  Prihvatam sve
                </button>
                <button
                  onClick={declineAll}
                  className="cursor-pointer rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 hover:bg-gray-100"
                >
                  Samo neophodni
                </button>
                <button
                  onClick={() => setOpen(true)}
                  className="cursor-pointer rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                >
                  Opcije
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} className="z-50">
        <div className="fixed inset-0 bg-black/40" />
        <div className="fixed inset-0 flex items-end justify-center p-4 z-50">
          <DialogPanel className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <DialogTitle className="text-lg! font-semibold">
              Podešavanje kolačića
            </DialogTitle>

            <fieldset className="mt-6 space-y-6">
              {/* Strictly necessary — always on, no toggle */}
              <div className="flex gap-3">
                <div className="text-sm/6">
                  <p className="font-semibold text-gray-700">
                    Strogo neophodni
                  </p>
                  <p className="text-gray-500">
                    Ovi kolačići su neophodni za funkcionisanje sajta i uvek su
                    aktivni.
                  </p>
                </div>
              </div>

              {/* Functional */}
              <div className="flex gap-3">
                <div className="flex h-6 shrink-0 items-center">
                  <div className="group grid size-4 grid-cols-1">
                    <input
                      id="functionals"
                      name="functionals"
                      type="checkbox"
                      checked={tmp.functional}
                      onChange={(e) =>
                        setTmp((s) => ({ ...s, functional: e.target.checked }))
                      }
                      aria-describedby="functionals-desc"
                      className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-(--secondary-color) checked:bg-(--secondary-color) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--secondary-color) forced-colors:appearance-auto"
                    />
                    <svg
                      fill="none"
                      viewBox="0 0 14 14"
                      className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white"
                    >
                      <path
                        d="M3 8L6 11L11 3.5"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-0 group-has-checked:opacity-100"
                      />
                    </svg>
                  </div>
                </div>
                <div className="text-sm/6">
                  <label
                    htmlFor="functionals"
                    className="font-semibold text-gray-700"
                  >
                    Funkcionalni
                  </label>
                  <p id="functionals-desc" className="text-gray-500">
                    Poboljšavaju iskustvo (npr. preferencije interfejsa, chat
                    widget).
                  </p>
                </div>
              </div>

              {/* Analytics */}
              <div className="flex gap-3">
                <div className="flex h-6 shrink-0 items-center">
                  <div className="group grid size-4 grid-cols-1">
                    <input
                      id="analytics"
                      name="analytics"
                      type="checkbox"
                      checked={tmp.analytics}
                      onChange={(e) =>
                        setTmp((s) => ({ ...s, analytics: e.target.checked }))
                      }
                      aria-describedby="analytics-desc"
                      className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-(--secondary-color) checked:bg-(--secondary-color) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--secondary-color) forced-colors:appearance-auto"
                    />
                    <svg
                      fill="none"
                      viewBox="0 0 14 14"
                      className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white"
                    >
                      <path
                        d="M3 8L6 11L11 3.5"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-0 group-has-checked:opacity-100"
                      />
                    </svg>
                  </div>
                </div>
                <div className="text-sm/6">
                  <label
                    htmlFor="analytics"
                    className="font-semibold text-gray-700"
                  >
                    Analitika
                  </label>
                  <p id="analytics-desc" className="text-gray-500">
                    Anonimne statistike posete (Google Analytics i sl.).
                  </p>
                </div>
              </div>
            </fieldset>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
              >
                Zatvori
              </button>
              <button
                onClick={() => {
                  acceptSelected({ ...tmp, decided: true });
                  setOpen(false);
                }}
                className="rounded-md bg-(--secondary-color) px-4 py-2 text-sm font-semibold text-white hover:bg-(--secondary-color)/85"
              >
                Sačuvaj izbor
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
