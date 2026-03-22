// lib/cookieManager.ts
// Strictly typed cookie manager for GDPR categories

export type CookieCategory = "necessary" | "functional" | "analytics";

export interface CookieConsentState {
  necessary: boolean; // always true
  functional: boolean;
  analytics: boolean;
}

const STORAGE_KEY = "cookie_consent_state";

/**
 * Returns default state (used when nothing is stored yet)
 */
export function getDefaultConsent(): CookieConsentState {
  return {
    necessary: true,
    functional: false,
    analytics: false,
  };
}

/**
 * Loads stored consent state from localStorage
 * Always returns a fully typed + valid structure
 */
export function getStoredConsent(): CookieConsentState {
  if (typeof window === "undefined") {
    return getDefaultConsent();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultConsent();

    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;

    return {
      necessary: true, // strictly required → cannot be changed
      functional: Boolean(parsed.functional),
      analytics: Boolean(parsed.analytics),
    };
  } catch {
    return getDefaultConsent();
  }
}

/**
 * Saves the full consent state into localStorage
 */
export function saveConsent(state: CookieConsentState): void {
  if (typeof window === "undefined") return;

  const toStore: CookieConsentState = {
    necessary: true, // enforce rule
    functional: state.functional,
    analytics: state.analytics,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
}

/**
 * Updates a single category
 */
export function updateConsent(category: CookieCategory, value: boolean): void {
  const current = getStoredConsent();

  const updated: CookieConsentState = {
    ...current,
    [category]: category === "necessary" ? true : value,
  };

  saveConsent(updated);
}

/**
 * Utility: check if analytics is allowed
 */
export function analyticsAllowed(): boolean {
  return getStoredConsent().analytics === true;
}

/**
 * Utility: check if functional cookies are allowed
 */
export function functionalAllowed(): boolean {
  return getStoredConsent().functional === true;
}

/**
 * Utility: reset consent completely (for debugging or settings page)
 */
export function resetConsent(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
