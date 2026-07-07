/**
 * Storage collector — da li localStorage/sessionStorage/cookies/indexedDB
 * stvarno RADE (ne samo da postoje): Safari privatni režim i stroga browser
 * podešavanja bacaju na write, a bez storage-a auth tokeni ne mogu da žive
 * (support slučaj "stalno me izloguje / ne mogu da se ulogujem").
 */
import type { ModuleResult } from "../types";
import { capData, capDetail } from "../types";

type StorageProbe = "ok" | "blokiran" | "nedostupan";

function probeWebStorage(storage: Storage): StorageProbe {
  const KEY = "__panta_diag__";
  try {
    storage.setItem(KEY, "1");
    const ok = storage.getItem(KEY) === "1";
    storage.removeItem(KEY);
    return ok ? "ok" : "blokiran";
  } catch {
    return "blokiran";
  }
}

function probeCookies(): StorageProbe {
  try {
    if (!navigator.cookieEnabled) return "blokiran";
    document.cookie = "__panta_diag__=1; path=/; max-age=60";
    const ok = document.cookie.includes("__panta_diag__=1");
    document.cookie = "__panta_diag__=; path=/; max-age=0";
    return ok ? "ok" : "blokiran";
  } catch {
    return "blokiran";
  }
}

function probeIndexedDb(timeoutMs = 1500): Promise<StorageProbe> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") {
        resolve("nedostupan");
        return;
      }
      const timer = setTimeout(() => resolve("blokiran"), timeoutMs);
      const req = indexedDB.open("__panta_diag__", 1);
      req.onsuccess = () => {
        clearTimeout(timer);
        req.result.close();
        try {
          indexedDB.deleteDatabase("__panta_diag__");
        } catch {
          /* čišćenje je best-effort */
        }
        resolve("ok");
      };
      req.onerror = () => {
        clearTimeout(timer);
        resolve("blokiran");
      };
    } catch {
      resolve("blokiran");
    }
  });
}

export async function collectStorage(): Promise<ModuleResult> {
  const base = { key: "storage", name: "Skladište (tokeni, keš)", ms: null };
  try {
    const local = probeWebStorage(window.localStorage);
    const session = probeWebStorage(window.sessionStorage);
    const cookies = probeCookies();
    const indexedDb = await probeIndexedDb();

    const data = { localStorage: local, sessionStorage: session, cookies, indexedDB: indexedDb };
    const broken = Object.entries(data).filter(([, v]) => v !== "ok");

    // Bez cookies + localStorage auth ne može da funkcioniše — to je fail.
    const authDead = cookies !== "ok" && local !== "ok";

    return {
      ...base,
      state: broken.length === 0 ? "ok" : authDead ? "fail" : "warn",
      detail: capDetail(
        broken.length === 0
          ? "sve dostupno"
          : `problem: ${broken.map(([k, v]) => `${k} ${v}`).join(", ")}`,
      ),
      data: capData(data),
    };
  } catch (err) {
    return {
      ...base,
      state: "fail",
      detail: capDetail(
        `collector pao (${err instanceof Error ? err.name : "greška"})`,
      ),
    };
  }
}
