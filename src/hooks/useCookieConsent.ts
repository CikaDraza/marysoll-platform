"use client";

import { useCallback, useEffect, useState } from "react";

export type CookieCategories = {
  necessary: true; // always true
  functional: boolean;
  analytics: boolean;
  decided?: boolean;
};

const STORAGE_KEY = "cookie_consent_v2";

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieCategories | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setConsent(JSON.parse(raw));
      } else {
        // default: only necessary true
        setConsent({
          necessary: true,
          functional: false,
          analytics: false,
          decided: false,
        });
      }
    } catch {
      setConsent({
        necessary: true,
        functional: false,
        analytics: false,
        decided: false,
      });
    } finally {
      setReady(true);
    }
  }, []);

  const save = useCallback((next: CookieCategories) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setConsent(next);
  }, []);

  const acceptAll = useCallback(() => {
    save({ necessary: true, functional: true, analytics: true, decided: true });
  }, [save]);

  const acceptSelected = useCallback(
    (selection: Omit<CookieCategories, "necessary">) => {
      save({ necessary: true, ...selection, decided: true });
    },
    [save],
  );

  const declineAll = useCallback(() => {
    save({
      necessary: true,
      functional: false,
      analytics: false,
      decided: true,
    });
  }, [save]);

  return {
    consent,
    ready,
    acceptAll,
    acceptSelected,
    declineAll,
    save,
  };
}
