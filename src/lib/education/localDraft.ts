import type { EducationEditorState } from "@/components/education/education-content-editor-model";

/**
 * Lokalna kopija radne verzije, nezavisna od mreže.
 *
 * Serverski autosave pokriva normalan rad, a `keepalive` čuvanje pri izlasku
 * pokriva brzo zatvaranje — ali `keepalive` ima mali budžet za telo zahteva,
 * pa za članak od nekoliko strana nije garancija. Ovo je poslednja mreža za
 * pad pregledača, prekid veze i velike dokumente.
 *
 * NIJE sinhronizacija i nema rešavanje konflikata: čuva se poslednje stanje
 * jednog uređaja, a korisnica pri otvaranju bira da li ga vraća.
 */
export interface EducationLocalDraft<T = EducationEditorState> {
  key: string;
  tenantId: string;
  contentId: string;
  /** Vreme lokalnog upisa; poredi se sa serverskim `workingSavedAt`. */
  savedAt: number;
  state: T;
}

const DB_NAME = "marysoll-education-drafts";
const STORE = "drafts";
const DB_VERSION = 1;

/** Admin origin je zajednički za sve tenante, pa ključ mora nositi tenant. */
export function localDraftKey(tenantId: string, contentId: string): string {
  return `${tenantId}:${contentId}`;
}

/**
 * Da li lokalnu kopiju uopšte treba ponuditi.
 *
 * Nudi se samo kad je STVARNO novija od onoga što server ima; inače bi
 * korisnica pri svakom otvaranju dobijala pitanje bez razloga. Zapis bez
 * serverskog `workingSavedAt` znači da server nema nijedno čuvanje radne
 * kopije, pa je svaka lokalna verzija novija.
 */
export function shouldOfferRecovery(params: {
  draft?: Pick<EducationLocalDraft, "savedAt"> | null;
  serverWorkingSavedAt?: string | Date | null;
}): boolean {
  if (!params.draft) return false;
  if (!params.serverWorkingSavedAt) return true;

  const server = new Date(params.serverWorkingSavedAt).getTime();
  if (Number.isNaN(server)) return true;
  return params.draft.savedAt > server;
}

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    // Privatni prozor ili blokiran storage: rad se nastavlja bez lokalne kopije.
    request.onerror = () => resolve(null);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T | null> {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      tx.oncomplete = () => { db.close(); resolve(request.result as T); };
      const failed = () => { db.close(); resolve(null); };
      tx.onerror = failed;
      tx.onabort = failed;
    } catch {
      db.close();
      resolve(null);
    }
  });
}

const mirrorKey = (key: string) => `education-draft:${key}`;

function readMirror<T>(key: string): EducationLocalDraft<T> | null {
  try {
    const value = JSON.parse(localStorage.getItem(mirrorKey(key)) ?? "null");
    return value?.key === key && Number.isFinite(value.savedAt) && value.state ? value : null;
  } catch { return null; }
}

/** Synchronous mirror survives pagehide before IndexedDB can finish. */
export async function putLocalDraft<T>(draft: EducationLocalDraft<T>): Promise<boolean> {
  let mirrored = false;
  try {
    localStorage.setItem(mirrorKey(draft.key), JSON.stringify(draft));
    mirrored = true;
  } catch { /* IndexedDB may still be available. */ }
  const result = await withStore("readwrite", (store) => store.put(draft));
  return mirrored || result !== null;
}

export async function readLocalDraft<T = EducationEditorState>(tenantId: string, contentId: string): Promise<EducationLocalDraft<T> | null> {
  const key = localDraftKey(tenantId, contentId);
  const mirror = readMirror<T>(key);
  const stored = await withStore<EducationLocalDraft<T>>("readonly", (store) => store.get(key));
  if (!stored || (mirror && mirror.savedAt >= stored.savedAt)) return mirror;
  return stored;
}

/** Delete in the same transaction as the timestamp check. */
export async function clearLocalDraftIfConfirmed(tenantId: string, contentId: string, confirmedSavedAt: number): Promise<void> {
  const key = localDraftKey(tenantId, contentId);
  const mirror = readMirror(key);
  if (mirror && mirror.savedAt <= confirmedSavedAt) {
    try { localStorage.removeItem(mirrorKey(key)); } catch { /* Unavailable storage. */ }
  }
  const db = await openDatabase();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const request = store.get(key);
      request.onsuccess = () => {
        const stored = request.result as EducationLocalDraft | undefined;
        if (stored && stored.savedAt <= confirmedSavedAt) store.delete(key);
      };
      const done = () => { db.close(); resolve(); };
      tx.oncomplete = done;
      tx.onerror = done;
      tx.onabort = done;
    } catch { db.close(); resolve(); }
  });
}
