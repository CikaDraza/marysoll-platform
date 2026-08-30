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
export interface EducationLocalDraft {
  key: string;
  tenantId: string;
  contentId: string;
  /** Vreme lokalnog upisa; poredi se sa serverskim `workingSavedAt`. */
  savedAt: number;
  state: EducationEditorState;
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
      const request = run(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function putLocalDraft(draft: EducationLocalDraft): Promise<void> {
  await withStore("readwrite", (store) => store.put(draft));
}

export async function readLocalDraft(
  tenantId: string,
  contentId: string,
): Promise<EducationLocalDraft | null> {
  return withStore<EducationLocalDraft>("readonly", (store) =>
    store.get(localDraftKey(tenantId, contentId)),
  );
}

/**
 * Briše lokalnu kopiju SAMO ako je server potvrdio baš nju.
 *
 * Ako je korisnica u međuvremenu nastavila da piše, lokalna kopija je novija
 * od potvrđene i mora da preživi — inače bismo obrisali jedinu kopiju izmena
 * koje server još nije video.
 */
export async function clearLocalDraftIfConfirmed(
  tenantId: string,
  contentId: string,
  confirmedSavedAt: number,
): Promise<void> {
  const stored = await readLocalDraft(tenantId, contentId);
  if (!stored || stored.savedAt > confirmedSavedAt) return;

  await withStore("readwrite", (store) =>
    store.delete(localDraftKey(tenantId, contentId)),
  );
}
