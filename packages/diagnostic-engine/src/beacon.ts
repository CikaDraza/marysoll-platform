/**
 * sendDiagBeacon — slanje dijagnostičkog beacona na write endpoint hosta.
 * navigator.sendBeacon preživljava i unload stranice; endpoint parsira
 * req.text() pa Content-Type nije bitan. Client-only.
 *
 * (Preseljeno verbatim iz marysoll src/lib/diag-beacon.ts — ponašanje isto.)
 */

const DEFAULT_ENDPOINT = "/api/public/diag-report";

export function sendDiagBeacon(
  label: string,
  extra?: Record<string, unknown>,
  endpoint: string = DEFAULT_ENDPOINT,
): void {
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
    navigator.sendBeacon(endpoint, payload);
  } catch {
    /* dijagnostika nikad ne sme da sruši stranicu */
  }
}
