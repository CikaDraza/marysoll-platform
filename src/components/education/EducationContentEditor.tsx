"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import toast from "react-hot-toast";
import { ContentBlocksEditor } from "@/components/content-composer/editor/ContentBlocksEditor";
import { PreviewRenderer } from "@/components/content-composer/PreviewRenderer";
import { useContentMediaAuthoring } from "@/hooks/useContentMediaAuthoring";
import { getContentMutationErrorMessage } from "@/lib/content/validation/contentValidationClient";
import {
  EDUCATION_KIND_LABELS,
  EDUCATION_VISIBILITY_HELP,
  EDUCATION_VISIBILITY_LABELS,
  type EducationContentRecord,
} from "@/lib/education/content-document";
import {
  EDUCATION_CONTENT_KINDS,
  EDUCATION_CONTENT_VISIBILITIES,
} from "@/types/education-content";
import { useEducationContentMutations } from "@/hooks/education/useEducationContent";
import {
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

  const { create, update, publish, remove } = useEducationContentMutations(recordId);
  const dirty = useMemo(
    () => isEducationEditorDirty(state, baseline),
    [state, baseline],
  );
  const busy =
    create.isPending || update.isPending || publish.isPending || remove.isPending;

  const patch = (changes: Partial<EducationEditorState>) =>
    setState((current) => ({ ...current, ...changes }));

  /** Vraća id sačuvanog zapisa ili null kada čuvanje nije uspelo. */
  const persist = async (): Promise<string | null> => {
    if (!state.title.trim()) {
      toast.error("Unesite naslov pre čuvanja.");
      return null;
    }

    try {
      if (!recordId || !baseline) {
        const created = await create.mutateAsync(createPayload(state));
        const nextState = editorStateFromRecord(created);
        setRecordId(created.id);
        setPublication(educationPublicationStateFromRecord(created));
        setState(nextState);
        setBaseline(nextState);

        // `router.replace` bi prešao sa /new na /[id] — drugi segment rute,
        // dakle demontiranje celog editora i „Učitavanje sadržaja…" usred
        // pisanja. Adresa se zato menja bez navigacije: editor ostaje na mestu
        // i prvo snimanje izgleda isto kao svako sledeće.
        window.history.replaceState(null, "", `/education/content/${created.id}`);
        return created.id;
      }

      const changes = updatePayload(state, baseline);
      if (Object.keys(changes).length === 0) return recordId;

      const saved = await update.mutateAsync(changes);
      const nextState = editorStateFromRecord(saved);
      setPublication(educationPublicationStateFromRecord(saved));
      setState(nextState);
      setBaseline(nextState);
      return saved.id;
    } catch (error) {
      toast.error(getContentMutationErrorMessage(error, "Čuvanje nije uspelo"));
      return null;
    }
  };

  const handleSave = async () => {
    const saved = await persist();
    if (saved) toast.success("Sačuvano");
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

  const handleDelete = async () => {
    if (!recordId) return;
    if (!window.confirm("Trajno obrisati ovaj sadržaj?")) return;

    try {
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
            {dirty && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                Nesačuvane izmene
              </span>
            )}
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
            Vidljivost
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {EDUCATION_CONTENT_VISIBILITIES.map((visibility) => (
              <label
                key={visibility}
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition ${
                  state.visibility === visibility
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                    : "border-gray-300 dark:border-gray-700"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  className="mt-0.5"
                  checked={state.visibility === visibility}
                  onChange={() => patch({ visibility })}
                />
                <span>
                  <span className="block font-semibold text-gray-900 dark:text-white">
                    {EDUCATION_VISIBILITY_LABELS[visibility]}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                    {EDUCATION_VISIBILITY_HELP[visibility]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

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
                  {EDUCATION_VISIBILITY_LABELS[state.visibility]}
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
