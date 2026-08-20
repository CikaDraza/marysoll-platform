/**
 * Bezbedne auth probe za support dijagnostiku.
 *
 * Koriste rezervisani `.invalid` email, pa nikada ne mogu pogoditi stvaran
 * nalog, promeniti token ili poslati email. Cilj je samo da se potvrdi da
 * browser može do auth ruta i da serverski put do baze odgovara.
 */
import type { ModuleResult } from "../types";
import { capDetail } from "../types";

const DIAGNOSTIC_EMAIL = "marysoll-diagnostic@account.invalid";

async function postWithTimeout(
  url: string,
  body: Record<string, string>,
  timeoutMs: number,
): Promise<{ status: number; ms: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    return {
      status: response.status,
      ms: Math.round(performance.now() - started),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function runLoginServiceProbe(
  url: string,
  timeoutMs = 8000,
): Promise<ModuleResult> {
  const base = { key: "login-service", name: "Servis za prijavu" };
  try {
    const result = await postWithTimeout(
      url,
      { email: DIAGNOSTIC_EMAIL, password: "diagnostic-only-never-valid" },
      timeoutMs,
    );
    const expectedRejection = [401, 403, 404].includes(result.status);
    return {
      ...base,
      state: expectedRejection ? "ok" : result.status >= 500 ? "fail" : "warn",
      ms: result.ms,
      detail: capDetail(
        expectedRejection
          ? `servis i baza odgovaraju (test nalog je pravilno odbijen, HTTP ${result.status})`
          : `neočekivan odgovor servisa (HTTP ${result.status})`,
      ),
      data: { testAccountUsed: false },
    };
  } catch (error) {
    return {
      ...base,
      state: "fail",
      ms: null,
      detail: capDetail(
        `servis nije dostupan (${error instanceof Error ? error.name : "greška"})`,
      ),
    };
  }
}

export async function runPasswordResetServiceProbe(
  url: string,
  timeoutMs = 8000,
): Promise<ModuleResult> {
  const base = { key: "password-reset-service", name: "Reset lozinke" };
  try {
    const result = await postWithTimeout(
      url,
      { email: DIAGNOSTIC_EMAIL },
      timeoutMs,
    );
    return {
      ...base,
      state: result.status === 200 ? "ok" : result.status >= 500 ? "fail" : "warn",
      ms: result.ms,
      detail: capDetail(
        result.status === 200
          ? "zahtev i baza rade; probni email nije poslat i isporuka u inbox nije testirana"
          : `neočekivan odgovor reset servisa (HTTP ${result.status})`,
      ),
      data: { emailDeliveryTested: false, testAccountUsed: false },
    };
  } catch (error) {
    return {
      ...base,
      state: "fail",
      ms: null,
      detail: capDetail(
        `reset servis nije dostupan (${error instanceof Error ? error.name : "greška"})`,
      ),
    };
  }
}
