"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import toast from "react-hot-toast";
import { ContentBlocksEditor } from "@/components/content-composer/editor/ContentBlocksEditor";
import { PreviewRenderer } from "@/components/content-composer/PreviewRenderer";
import { useContentMediaAuthoring } from "@/hooks/useContentMediaAuthoring";
import { getContentMutationErrorMessage } from "@/lib/content/validation/contentValidationClient";
import { saveEducationDraftOnExit } from "@/lib/education/exitSave";
import {
  EDUCATION_ACCESS_HELP,
  EDUCATION_ACCESS_LABELS,
  EDUCATION_KIND_LABELS,
  type EducationContentRecord,
} from "@/lib/education/content-document";
import {
  EDUCATION_ACCESS_MODES,
  EDUCATION_CONTENT_KINDS,
} from "@/types/education-content";
import { useEducationContentMutations } from "@/hooks/education/useEducationContent";
import {
  canAutosave,
  createPayload,
  editorStateFromRecord,
  educationPublicationStateFromRecord,
  emptyEducationEditorState,
  isEducationEditorDirty,
  previewSlug,
  publicationLabel,
  updatePayload,
  type EducationEditorState,
  type EducationPublicationState,
} from "./education-content-editor-model";

type Tab = "editor" | "preview";
type AutosaveState = "idle" | "saving" | "saved" | "error";

/** Koliko mirovanja pre tihog čuvanja — dovoljno da ne šalje na svako slovo. */
const AUTOSAVE_DELAY_MS = 2000;

interface Props {
  record?: EducationContentRecord;
}

const FIELD_CLASS =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

export default function EducationContentEditor({ record }: Props) {
  const router = useRouter();
  const mediaAdapter = useContentMediaAuthoring();

  const [baseline, setBaseline] = useState<EducationEditorState | null>(
    record ? editorStateFromRecord(record) : null,
  );
  const [state, setState] = useState<EducationEditorState>(
    record ? editorStateFromRecord(record) : emptyEducationEditorState(),
  );
  // Stanje objave dolazi sa servera; radna kopija se uređuje nezavisno od nje.
  const [publication, setPublication] = useState<EducationPublicationState>(
    record
      ? educationPublicationStateFromRecord(record)
      : { status: "draft", publishedSnapshot: null, workingSavedAt: null },
  );
  const [recordId, setRecordId] = useState(record?.id);
  const [tab, setTab] = useState<Tab>("editor");
  const [autosave, setAutosave] = useState<AutosaveState>("idle");

  const { create, update, publish, remove } = useEducationContentMutations(recordId);
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

      const saved = await update.mutateAsync(changes);
      setPublication(educationPublicationStateFromRecord(saved));
      // Server sada drži tačno ono što je poslato; sve novije kucanje ostaje
      // „prljavo" i biće poslato sledećim čuvanjem.
      setBaseline(sent);
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

    saveEducationDraftOnExit(
      current.recordId,
      updatePayload(current.state, current.baseline),
    );
  }, []);

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
        href="/education/content"
        className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
      >
        ← Sadržaj
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {recordId ? "Uredi sadržaj" : "Novi sadržaj"}
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

      <section className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Naslov
          </span>
          <input
            value={state.title}
            onChange={(event) => patch({ title: event.target.value })}
            placeholder="Npr. Estetika lica"
            className={FIELD_CLASS}
          />
        </label>

        <label>
          <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Web adresa
          </span>
          <input
            value={state.slugTouched ? state.slug : slugPreview}
            onChange={(event) =>
              patch({ slug: event.target.value, slugTouched: true })
            }
            placeholder="estetika-lica"
            className={FIELD_CLASS}
          />
        </label>

        <label>
          <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Vrsta
          </span>
          <select
            value={state.kind}
            onChange={(event) =>
              patch({ kind: event.target.value as EducationEditorState["kind"] })
            }
            className={FIELD_CLASS}
          >
            {EDUCATION_CONTENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {EDUCATION_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200">
            Ko može da vidi
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {EDUCATION_ACCESS_MODES.map((mode) => (
              <label
                key={mode}
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition ${
                  state.accessMode === mode
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                    : "border-gray-300 dark:border-gray-700"
                }`}
              >
                <input
                  type="radio"
                  name="accessMode"
                  className="mt-0.5"
                  checked={state.accessMode === mode}
                  onChange={() => patch({ accessMode: mode })}
                />
                <span>
                  <span className="block font-semibold text-gray-900 dark:text-white">
                    {EDUCATION_ACCESS_LABELS[mode]}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                    {EDUCATION_ACCESS_HELP[mode]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Zaključan sadržaj je javno otkriven, pa mora imati šta da pokaže —
            i to isključivo ovo, nikada deo teksta. */}
        {state.accessMode === "gated" && (
          <fieldset className="sm:col-span-2 rounded-2xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
            <legend className="px-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
              Javni pregled
            </legend>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Ovo vide svi. Sam tekst ostaje zaključan dok ne odobrite pristup.
            </p>
            <div className="grid gap-3">
              <input
                value={state.publicPreview.title ?? ""}
                onChange={(event) =>
                  patch({
                    publicPreview: {
                      ...state.publicPreview,
                      title: event.target.value,
                    },
                  })
                }
                placeholder={state.title || "Naslov u pregledu"}
                className={FIELD_CLASS}
              />
              <textarea
                value={state.publicPreview.description ?? ""}
                onChange={(event) =>
                  patch({
                    publicPreview: {
                      ...state.publicPreview,
                      description: event.target.value,
                    },
                  })
                }
                rows={2}
                placeholder="Kratak opis koji nagoveštava sadržaj"
                className={FIELD_CLASS}
              />
              <input
                value={state.publicPreview.coverImage ?? ""}
                onChange={(event) =>
                  patch({
                    publicPreview: {
                      ...state.publicPreview,
                      coverImage: event.target.value,
                    },
                  })
                }
                placeholder="Adresa naslovne slike"
                className={FIELD_CLASS}
              />
            </div>
          </fieldset>
        )}

        {/* SEO postoji za javno i zaključano — oba su javno otkrivena. Privatan
            sadržaj nema javnu stranu, pa ni SEO. */}
        {state.accessMode !== "private" && (
        <Disclosure as="div" className="sm:col-span-2">
          <DisclosureButton className="group flex items-center gap-2 text-sm font-semibold text-violet-600 underline-offset-4 hover:underline dark:text-violet-400">
            Uredi SEO
            <span className="font-normal text-gray-500 no-underline dark:text-gray-400">
              {hasCustomSeo
                ? "· SEO podešen"
                : "· koristi automatske vrednosti"}
            </span>
          </DisclosureButton>
          <DisclosurePanel className="mt-3 grid gap-3">
            <input
              value={state.seo.title ?? ""}
              onChange={(event) =>
                patch({ seo: { ...state.seo, title: event.target.value } })
              }
              placeholder={state.title || "SEO naslov"}
              className={FIELD_CLASS}
            />
            <textarea
              value={state.seo.description ?? ""}
              onChange={(event) =>
                patch({ seo: { ...state.seo, description: event.target.value } })
              }
              rows={3}
              placeholder="Kratak opis za pretragu i deljenje"
              className={FIELD_CLASS}
            />
            <input
              value={state.seo.ogImage ?? ""}
              onChange={(event) =>
                patch({ seo: { ...state.seo, ogImage: event.target.value } })
              }
              placeholder="Adresa slike za deljenje"
              className={FIELD_CLASS}
            />
          </DisclosurePanel>
        </Disclosure>
        )}
      </section>

      {tab === "editor" ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <ContentBlocksEditor
            blocks={state.blocks}
            mediaAdapter={mediaAdapter}
            onChange={(blocks) => patch({ blocks })}
          />
        </section>
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
