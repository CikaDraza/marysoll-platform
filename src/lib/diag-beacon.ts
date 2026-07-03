/**
 * sendDiagBeacon — slanje dijagnostičkog beacona u DiagReport kolekciju
 * (/api/public/diag-report). Koriste ga DashboardBeacon (boot/alive/error)
 * i dashboard error boundary. navigator.sendBeacon preživljava i unload;
 * endpoint parsira req.text() pa Content-Type nije bitan. Client-only.
 */
export function sendDiagBeacon(label: string, extra?: Record<string, unknown>) {
  try {
    const payload = JSON.stringify({
      label,
      pageHost: window.location.host,
      results: [
        {
          key: label,
          name: label,
          state: "info",
          ms: Math.round(performance.now()),
          detail: JSON.stringify(extra ?? {}).slice(0, 2000),
        },
      ],
    });
    navigator.sendBeacon("/api/public/diag-report", payload);
  } catch {
    /* dijagnostika nikad ne sme da sruši stranicu */
  }
}
