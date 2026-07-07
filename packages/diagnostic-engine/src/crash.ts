/**
 * attachCrashReporter — daljinska "crna kutija" za stranice čiju konzolu ne
 * vidimo (support slučaj: stranica se ruši na iOS-u kod korisnika).
 *
 * Šalje tri vrste beacona (scope="dash" daje istorijske "dash-*" oznake):
 *   - "{scope}-boot"  — JS je krenuo da se izvršava (odmah)
 *   - "{scope}-error" — uhvaćen window error / unhandled rejection (poruka+stack)
 *   - "{scope}-alive" — stranica je preživela prvih aliveAfterMs (default 5s)
 *
 * Čitanje ishoda: boot bez alive = JS umro u <5s; error = imamo stack sa
 * uređaja; ništa = chunkovi se uopšte ne izvršavaju.
 *
 * Vraća cleanup funkciju (skida listenere i alive tajmer) — zgodno kao
 * povratna vrednost React useEffect-a kod potrošača.
 *
 * (Logika preseljena verbatim iz marysoll DashboardBeacon komponente.)
 */
import { sendDiagBeacon } from "./beacon";

export interface CrashReporterOptions {
  aliveAfterMs?: number;
  endpoint?: string;
}

export function attachCrashReporter(
  scope: string,
  opts: CrashReporterOptions = {},
): () => void {
  const { aliveAfterMs = 5000, endpoint } = opts;

  try {
    sendDiagBeacon(
      `${scope}-boot`,
      { url: window.location.pathname + window.location.search },
      endpoint,
    );
  } catch {
    /* nikad ne ruši host */
  }

  const onError = (e: ErrorEvent) => {
    sendDiagBeacon(
      `${scope}-error`,
      {
        message: String(e.message).slice(0, 500),
        source: `${e.filename ?? "?"}:${e.lineno ?? 0}:${e.colno ?? 0}`,
        stack: e.error instanceof Error ? e.error.stack?.slice(0, 1500) : null,
      },
      endpoint,
    );
  };
  const onRejection = (e: PromiseRejectionEvent) => {
    const r: unknown = e.reason;
    sendDiagBeacon(
      `${scope}-error`,
      {
        type: "unhandledrejection",
        message:
          r instanceof Error ? r.message.slice(0, 500) : String(r).slice(0, 500),
        stack: r instanceof Error ? (r.stack?.slice(0, 1500) ?? null) : null,
      },
      endpoint,
    );
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  const t = setTimeout(() => sendDiagBeacon(`${scope}-alive`, undefined, endpoint), aliveAfterMs);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    clearTimeout(t);
  };
}
