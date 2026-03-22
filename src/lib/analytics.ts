import { getStoredConsent } from "./cookieManager";

export function loadAnalyticsScript(id: string) {
  const consent = getStoredConsent();

  if (!consent.analytics) return; // analytics disabled

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];

  window.gtag("js", new Date());
  window.gtag("config", id);
}
