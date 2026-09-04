"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ContentBlocksEditor } from "@/components/content-composer/editor/ContentBlocksEditor";
import { PreviewRenderer } from "@/components/content-composer/PreviewRenderer";
import { useContentMediaAuthoring } from "@/hooks/useContentMediaAuthoring";
import { getContentMutationErrorMessage } from "@/lib/content/validation/contentValidationClient";
import { saveEducationDraftOnExit } from "@/lib/education/exitSave";
import EducationClientAccess from "./EducationClientAccess";
import { createContentBlockId } from "@/lib/content/editor/blockFactories";
import {
  educationAuthoringMode,
  type EducationStartMode,
} from "@/lib/education/authoringStart";
import {
  clearLocalDraftIfConfirmed,
  putLocalDraft,
  readLocalDraft,
  shouldOfferRecovery,
} from "@/lib/education/localDraft";
import { useAuth } from "@/hooks/useAuth";
import {
  EDUCATION_ACCESS_LABELS,
  EDUCATION_KIND_LABELS,
  type EducationContentRecord,
} from "@/lib/education/content-document";
import {
  useEducationContentMutations,
  useEducationTaxonomy,
} from "@/hooks/education/useEducationContent";
import {
  canAutosave,
  applyEducationImportDraft,
  createPayload,
  educationPublicationStateFromRecord,
  initializeEducationEditorState,
  isEducationEditorDirty,
  previewSlug,
  publicationLabel,
  updatePayload,
  type EducationEditorState,
  type EducationPublicationState,
} from "./education-content-editor-model";
import {
  EducationAccessSection,
  EducationAdvancedSettings,
  EducationBasicSection,
  EducationCoverSection,
  EducationDownloadSection,
  EducationEditorSection,
  EducationImportPanel,
  EducationTaxonomySection,
} from "./EducationEditorSections";

type Tab = "editor" | "preview";

interface ImportResponse {
  draft: {
    title: string;
    hero: { subtitle?: string };
    blocks: EducationEditorState["blocks"];
  };
  summary: { sections: number; lists: number; callouts: number };
}

/**
 * Identifikator jedne editor sesije. `useState` sa inicijalizatorom ga pravi
 * tačno jednom, i to izvan rendera — vidi pravila čistote React komponenti.
 */
function newEditorSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
type AutosaveState = "idle" | "saving" | "saved" | "error";

/** Koliko mirovanja pre tihog čuvanja — dovoljno da ne šalje na svako slovo. */
const AUTOSAVE_DELAY_MS = 2000;
/** Lokalna kopija se piše češće: upis je jeftin i ne ide preko mreže. */
const LOCAL_DRAFT_DELAY_MS = 600;

interface Props {
  record?: EducationContentRecord;
  startMode?: EducationStartMode;
}

export default function EducationContentEditor({
  record,
  startMode = "article",
}: Props) {
  const router = useRouter();
  const mediaAdapter = useContentMediaAuthoring();
  const { tenantId, token } = useAuth();

  const [initialState] = useState(() =>
    initializeEducationEditorState(record, startMode, createContentBlockId),
  );
  const [baseline, setBaseline] = useState<EducationEditorState>(initialState);
  const [state, setState] = useState<EducationEditorState>(initialState);
  const authoringMode = educationAuthoringMode(record, startMode);
  // Stanje objave dolazi sa servera; radna kopija se uređuje nezavisno od nje.
  const [publication, setPublication] = useState<EducationPublicationState>(
    record
      ? educationPublicationStateFromRecord(record)
      : { status: "draft", publishedSnapshot: null, workingSavedAt: null },
  );
  const [recordId, setRecordId] = useState(record?.id);
  const [tab, setTab] = useState<Tab>("editor");
  const [autosave, setAutosave] = useState<AutosaveState>("idle");
  const [recovery, setRecovery] = useState<EducationEditorState | null>(null);

  /**
   * Jedna editor sesija = jedan `sessionId` i rastući `revision`. Server tako
   * može da odbaci čuvanje koje je preteklo novije, umesto da poslednji
   * pristigli zahtev pobedi bez obzira na to koliko je star.
   */
  const [sessionId] = useState(newEditorSessionId);
  const revisionRef = useRef(0);
  /** Vreme poslednjeg LOKALNOG upisa; po njemu se zna šta je server potvrdio. */
  const localStampRef = useRef(0);
  const nextSaveOrder = useCallback(
    () => ({ sessionId, revision: (revisionRef.current += 1) }),
    [sessionId],
  );

  const { create, update, publish, remove } = useEducationContentMutations(recordId);
  const { data: taxonomy } = useEducationTaxonomy();
  const dirty = useMemo(
    () => isEducationEditorDirty(state, baseline),
    [state, baseline],
  );
  const busy =
    create.isPending || update.isPending || publish.isPending || remove.isPending;

  const patch = (changes: Partial<EducationEditorState>) =>
    setState((current) => ({ ...current, ...changes }));

  /**
   * Vraća id sačuvanog zapisa ili null kada čuvanje nije uspelo.
   *
   * `silent` je tiho čuvanje: ono ne sme da bombarduje vlasnicu porukama dok
   * piše — greška se pokazuje kao stanje pored dugmeta, a sledeća izmena
   * pokušava ponovo.
   */
  const persist = async (silent = false): Promise<string | null> => {
    if (!state.title.trim()) {
      if (!silent) toast.error("Unesite naslov pre čuvanja.");
      return null;
    }

    // Stanje se pamti PRE poziva. Sve što vlasnica otkuca dok zahtev traje ne
    // sme da bude pregaženo odgovorom servera — a upravo bi se to desilo kad
    // bi se `state` posle uspeha punio iz odgovora.
    const sent = state;

    try {
      if (!recordId || !baseline) {
        const created = await create.mutateAsync(createPayload(sent));
        setRecordId(created.id);
        setPublication(educationPublicationStateFromRecord(created));

        // Jedino se slug preuzima sa servera, jer ga server normalizuje. Ostala
        // polja ostaju onakva kakva su u editoru u ovom trenutku.
        setState((current) =>
          current.slugTouched
            ? current
            : { ...current, slug: created.slug, slugTouched: true },
        );
        setBaseline({ ...sent, slug: created.slug, slugTouched: true });

        // `router.replace` bi prešao sa /new na /[id] — drugi segment rute,
        // dakle demontiranje celog editora i „Učitavanje sadržaja…" usred
        // pisanja. Adresa se zato menja bez navigacije: editor ostaje na mestu
        // i prvo snimanje izgleda isto kao svako sledeće.
        window.history.replaceState(null, "", `/education/content/${created.id}`);
        return created.id;
      }

      const changes = updatePayload(sent, baseline);
      if (Object.keys(changes).length === 0) return recordId;

      const { record: saved, stale } = await update.mutateAsync({
        ...changes,
        saveOrder: nextSaveOrder(),
      });

      // Odbačeno čuvanje ne sme da pomeri polazište unazad: server drži noviji
      // tekst, a ovaj zahtev je stigao prekasno.
      if (stale) return recordId;

      setPublication(educationPublicationStateFromRecord(saved));
      // Server sada drži tačno ono što je poslato; sve novije kucanje ostaje
      // „prljavo" i biće poslato sledećim čuvanjem.
      setBaseline(sent);
      void clearLocalDraftIfConfirmed(
        tenantId ?? "",
        saved.id,
        localStampRef.current,
      );
      return saved.id;
    } catch (error) {
      if (!silent) {
        toast.error(getContentMutationErrorMessage(error, "Čuvanje nije uspelo"));
      }
      return null;
    }
  };

  // Efekat ne sme da zavisi od `persist`, koji se pravi iznova pri svakom
  // renderu — inače bi se tajmer resetovao u krug. Ref se upisuje u efektu, ne
  // tokom rendera.
  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });

  const runAutosave = useCallback(async () => {
    setAutosave("saving");
    const saved = await persistRef.current(true);
    setAutosave(saved ? "saved" : "error");
  }, []);

  /**
   * Tiho čuvanje radne kopije. Sigurno je tek od UI-2B: Save dira isključivo
   * radnu kopiju, pa autosave ne može ništa da objavi niti da promeni ono što
   * je živo na sajtu.
   */
  useEffect(() => {
    if (!dirty || busy) return;
    if (!canAutosave(state, Boolean(recordId))) return;

    const timer = setTimeout(runAutosave, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, dirty, busy, recordId, runAutosave]);

  const [isImporting, setImporting] = useState(false);
  /** Šta je uvoz pročitao — ostaje na ekranu, za razliku od toasta. */
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const blocksRef = useRef<HTMLDivElement | null>(null);

  /**
   * Uvoz puni editor, ali ništa ne čuva i ne objavljuje: vlasnica vidi šta je
   * pročitano, ispravlja i sama snima. Zato uvoz sme da bude približan.
   */
  const importDocument = async (file: File) => {
    setImporting(true);
    try {
      const body = new FormData();
      body.append("file", file);

      // Ne kroz `api`: taj instance nosi `Content-Type: application/json`, pa
      // telo nikada ne postane multipart i granica se ne postavi. Isti razlog
      // zbog koga i upload slika ide direktnim `fetch`-om.
      const response = await fetch("/api/education/import", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
      });
      const data = (await response.json()) as ImportResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Uvoz nije uspeo");

      setState((current) => applyEducationImportDraft(current, data.draft));

      const { sections, lists, callouts } = data.summary;
      const summary = `Pročitano: ${sections} sekcija, ${lists} nabrajanja, ${callouts} napomena.`;
      setImportSummary(summary);
      toast.success(summary);

      // Rezultat je niže na strani; bez ovoga vlasnica ostaje na dugmetu i ne
      // vidi da se nešto uopšte dogodilo.
      requestAnimationFrame(() =>
        blocksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (error) {
      toast.error(
        getContentMutationErrorMessage(error, "Dokument nije moguće pročitati"),
      );
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    const saved = await persist();
    if (saved) {
      setAutosave("saved");
      toast.success("Sačuvano");
    }
  };

  const handlePublish = async () => {
    // Objava čita sačuvano stanje, pa nesačuvane izmene idu prve.
    const saved = await persist();
    if (!saved) return;

    try {
      const published = await publish.mutateAsync();
      setPublication(educationPublicationStateFromRecord(published));
      toast.success("Sadržaj je objavljen");
    } catch (error) {
      toast.error(getContentMutationErrorMessage(error, "Objava nije uspela"));
    }
  };

  /**
   * Lokalna kopija se piše nezavisno od mreže — ona je jedina koja preživi pad
   * pregledača, prekid veze i dokument prevelik za `keepalive`.
   */
  useEffect(() => {
    if (!recordId || !tenantId || !dirty) return;

    const timer = setTimeout(() => {
      localStampRef.current = Date.now();
      void putLocalDraft({
        key: `${tenantId}:${recordId}`,
        tenantId,
        contentId: recordId,
        savedAt: localStampRef.current,
        state,
      });
    }, LOCAL_DRAFT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [state, dirty, recordId, tenantId]);

  /** Pri otvaranju: ako lokalna kopija nije novija od serverske, ćuti. */
  useEffect(() => {
    if (!record?.id || !tenantId) return;

    let cancelled = false;
    void readLocalDraft(tenantId, record.id).then((draft) => {
      if (cancelled || !draft) return;
      if (!shouldOfferRecovery({ draft, serverWorkingSavedAt: record.workingSavedAt })) {
        return;
      }
      setRecovery(draft.state);
    });

    return () => {
      cancelled = true;
    };
  }, [record?.id, record?.workingSavedAt, tenantId]);

  /**
   * Poslednja odbrana: napuštanje strane, prelazak na drugi ekran i zatvaranje
   * kartice. Autosave pokriva pauzu u kucanju, ali ne i izlazak u prve dve
   * sekunde — a upravo tada je izgubljen tekst najskuplji.
   */
  const exitStateRef = useRef({ state, baseline, recordId, dirty });
  useEffect(() => {
    exitStateRef.current = { state, baseline, recordId, dirty };
  });

  const deletedRef = useRef(false);

  const flushOnExit = useCallback(() => {
    const current = exitStateRef.current;
    if (deletedRef.current || !current.dirty) return;
    if (!current.recordId || !current.baseline) return;
    if (!current.state.title.trim()) return;

    saveEducationDraftOnExit(current.recordId, {
      ...updatePayload(current.state, current.baseline),
      saveOrder: nextSaveOrder(),
    });
  }, [nextSaveOrder]);

  useEffect(() => {
    // `pagehide` hvata i zatvaranje kartice i mobilni prelazak u pozadinu, gde
    // `beforeunload` na iOS-u ne radi pouzdano.
    const onHidden = () => flushOnExit();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushOnExit();
    };

    window.addEventListener("pagehide", onHidden);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pagehide", onHidden);
      document.removeEventListener("visibilitychange", onVisibility);
      // Odlazak na drugi ekran u aplikaciji je demontiranje, ne `pagehide`.
      flushOnExit();
    };
  }, [flushOnExit]);

  const handleDelete = async () => {
    if (!recordId) return;
    if (!window.confirm("Trajno obrisati ovaj sadržaj?")) return;

    try {
      // Bez ovoga bi demontiranje posle brisanja poslalo izmenu na zapis koji
      // više ne postoji.
      deletedRef.current = true;
      await remove.mutateAsync(recordId);
      toast.success("Sadržaj je obrisan");
      router.push("/education/content");
    } catch (error) {
      toast.error(getContentMutationErrorMessage(error, "Brisanje nije uspelo"));
    }
  };

  const slugPreview = previewSlug(state);
  // Bez ovoga vlasnica ne zna da li SEO uopšte treba da otvara.
  const hasCustomSeo = Boolean(
    state.seo.title?.trim() ||
      state.seo.description?.trim() ||
      state.seo.ogImage?.trim(),
  );

  return (
    <div className="space-y-6">
      <Link
        href={recordId ? "/education/content" : "/education/content/new"}
        className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
      >
        {recordId ? "← Sadržaj" : "← Izaberi drugi početak"}
      </Link>

      {recovery && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30"
        >
          <span className="text-amber-900 dark:text-amber-200">
            Pronađene su novije nesačuvane izmene sa ovog uređaja.
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setState(recovery);
                setRecovery(null);
              }}
              className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
            >
              Vrati izmene
            </button>
            <button
              type="button"
              onClick={() => setRecovery(null)}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 dark:text-amber-200"
            >
              Odbaci
            </button>
          </span>
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {recordId
              ? authoringMode === "video"
                ? "Uredi video"
                : "Uredi članak"
              : authoringMode === "video"
                ? "Novi video"
                : "Novi članak"}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>{publicationLabel(publication)}</span>
            {autosave === "saving" ? (
              <span className="text-xs text-gray-400">Čuvanje…</span>
            ) : autosave === "error" ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                Nije sačuvano — pokušajte „Sačuvaj&rdquo;
              </span>
            ) : dirty ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                Nesačuvane izmene
              </span>
            ) : autosave === "saved" ? (
              <span className="text-xs text-gray-400">Sačuvano</span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {update.isPending || create.isPending ? "Čuvanje…" : "Sačuvaj"}
          </button>
          <button
            type="button"
            onClick={() => setTab(tab === "preview" ? "editor" : "preview")}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {tab === "preview" ? "Nazad na uređivanje" : "Pregled"}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={busy}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            {publish.isPending ? "Objavljivanje…" : "Objavi"}
          </button>
          {recordId && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
            >
              Obriši
            </button>
          )}
        </div>
      </header>

      {authoringMode === "import" && tab === "editor" && (
        <EducationImportPanel
          importing={isImporting}
          summary={importSummary}
          onImport={(file) => void importDocument(file)}
          onDismissSummary={() => setImportSummary(null)}
        />
      )}

      {tab === "editor" ? (
        <>
          <EducationBasicSection state={state} onChange={patch} />

          {taxonomy && (
            <EducationTaxonomySection
              taxonomy={taxonomy}
              state={state}
              onChange={patch}
            />
          )}

          <EducationEditorSection
            number="3 · Sadržaj"
            title={authoringMode === "video" ? "Video" : "Sadržaj članka"}
            description={
              authoringMode === "video"
                ? "Video je glavni sadržaj. Izvor unesite ovde; dodatna objašnjenja ostaju opciona."
                : "Uredite tekst po sekcijama. Možete dodavati, pomerati, sakrivati i duplirati blokove."
            }
            prominent
          >
            <div ref={blocksRef} className="space-y-6">
              {authoringMode === "video" ? (
                <>
                  <ContentBlocksEditor
                    blocks={state.blocks}
                    mediaAdapter={mediaAdapter}
                    includeTypes={["VideoBlock"]}
                    allowedTypes={["VideoBlock"]}
                    quickAddType="VideoBlock"
                    hideAddWhenVisible
                    addButtonLabel="Dodaj video"
                    emptyTitle="Video još nije dodat"
                    emptyHelp="Dodajte glavni video izvor."
                    onChange={(blocks) => patch({ blocks })}
                  />
                  <div className="border-t border-gray-200 pt-5 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Dodatno objašnjenje
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        opciono
                      </span>
                    </h3>
                    <p className="mt-1 mb-3 text-xs text-gray-500 dark:text-gray-400">
                      Dodajte tekst, korisne napomene ili slike koje prate video.
                    </p>
                    <ContentBlocksEditor
                      blocks={state.blocks}
                      mediaAdapter={mediaAdapter}
                      excludeRenderTypes={["VideoBlock", "FileDownloadBlock"]}
                      allowedTypes={[
                        "ArticleBlock",
                        "CalloutBlock",
                        "ChecklistBlock",
                        "ImageGalleryBlock",
                      ]}
                      addButtonLabel="Dodaj objašnjenje"
                      emptyTitle="Nema dodatnog objašnjenja"
                      emptyHelp="Video može biti objavljen i bez ovog opcionog dela."
                      onChange={(blocks) => patch({ blocks })}
                    />
                  </div>
                </>
              ) : (
                <ContentBlocksEditor
                  blocks={state.blocks}
                  mediaAdapter={mediaAdapter}
                  excludeTypes={["HeroBlock", "FileDownloadBlock"]}
                  excludeRenderTypes={["FileDownloadBlock"]}
                  onChange={(blocks) => patch({ blocks })}
                />
              )}
            </div>
          </EducationEditorSection>

          <EducationCoverSection
            state={state}
            mediaAdapter={mediaAdapter}
            onChange={patch}
          />

          <EducationDownloadSection
            blocks={state.blocks}
            mediaAdapter={mediaAdapter}
            onChange={(blocks) => patch({ blocks })}
          />

          <EducationAccessSection
            state={state}
            mediaAdapter={mediaAdapter}
            onChange={patch}
          />

          {/* Dodela ima smisla tek kad zapis postoji i kad nije javan svima. */}
          {recordId && state.accessMode !== "public" && (
            <EducationClientAccess
              contentId={recordId}
              accessMode={state.accessMode}
            />
          )}

          <EducationAdvancedSettings
            state={state}
            slugPreview={slugPreview}
            hasCustomSeo={hasCustomSeo}
            mediaAdapter={mediaAdapter}
            onChange={patch}
          />
        </>
      ) : (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <PreviewRenderer
            blocks={state.blocks}
            viewports={["mobile", "desktop"]}
            header={
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {state.title || "Bez naslova"}
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {EDUCATION_KIND_LABELS[state.kind]} ·{" "}
                  {EDUCATION_ACCESS_LABELS[state.accessMode]}
                  {slugPreview ? ` · /${slugPreview}` : ""}
                </p>
              </div>
            }
          />
        </section>
      )}

    </div>
  );
}
