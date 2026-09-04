import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { ContentBlocksEditor } from "@/components/content-composer/editor/ContentBlocksEditor";
import {
  AssetMediaField,
  ImageMediaField,
} from "@/components/content-composer/editor/MediaFields";
import type { ContentMediaAuthoringAdapter } from "@/lib/content/media/authoring";
import type { EducationTaxonomy } from "@/lib/education/taxonomy";
import {
  EDUCATION_ACCESS_HELP,
  EDUCATION_ACCESS_LABELS,
} from "@/lib/education/content-document";
import { EDUCATION_ACCESS_MODES } from "@/types/education-content";
import { EducationTaxonomyPicker } from "./EducationTaxonomyPicker";
import type { EducationEditorState } from "./education-content-editor-model";

export const EDUCATION_FIELD_CLASS =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

export function EducationEditorSection({
  number,
  title,
  description,
  prominent = false,
  children,
}: {
  number?: string;
  title: string;
  description?: string;
  prominent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border bg-white p-5 sm:p-6 dark:bg-gray-900 ${
        prominent
          ? "border-violet-200 shadow-sm dark:border-violet-900/60"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <header className="mb-5">
        {number && (
          <p className="text-xs font-bold uppercase tracking-widest text-violet-500">
            {number}
          </p>
        )}
        <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

export function EducationBasicSection({
  state,
  onChange,
}: {
  state: EducationEditorState;
  onChange: (changes: Partial<EducationEditorState>) => void;
}) {
  return (
    <EducationEditorSection number="1 · Osnovno" title="Naslov i kratak opis">
      <div className="space-y-5">
        <label>
          <span className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
            Naslov
          </span>
          <input
            value={state.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Npr. Kako prepoznati dehidriranu kožu"
            className={`${EDUCATION_FIELD_CLASS} py-3 text-base font-semibold sm:text-lg`}
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
            Kratak opis
          </span>
          <span className="mb-2 block text-xs leading-5 text-gray-500 dark:text-gray-400">
            Jedna ili dve rečenice koje se prikazuju na kartici sadržaja i na vrhu članka.
          </span>
          <textarea
            value={state.hero.subtitle ?? ""}
            onChange={(event) =>
              onChange({ hero: { ...state.hero, subtitle: event.target.value } })
            }
            rows={3}
            placeholder="Saznajte kako da razlikujete suvu od dehidrirane kože i prilagodite svakodnevnu negu."
            className={EDUCATION_FIELD_CLASS}
          />
        </label>
      </div>
    </EducationEditorSection>
  );
}

export function EducationTaxonomySection({
  taxonomy,
  state,
  onChange,
}: {
  taxonomy: EducationTaxonomy;
  state: EducationEditorState;
  onChange: (changes: Partial<EducationEditorState>) => void;
}) {
  return (
    <EducationEditorSection
      number="2 · Tema i cilj teksta"
      title="Usmerite čitaoca"
      description="Izaberite jednu temu i jedan cilj. Ovi podaci pomažu čitaocu da pronađe pravi sadržaj."
    >
      <EducationTaxonomyPicker
        taxonomy={taxonomy}
        topicKey={state.topicKey}
        intentKey={state.intentKey}
        onTopicChange={(topicKey) => onChange({ topicKey })}
        onIntentChange={(intentKey) => onChange({ intentKey })}
      />
    </EducationEditorSection>
  );
}

export function EducationImportPanel({
  importing,
  summary,
  onImport,
  onDismissSummary,
}: {
  importing: boolean;
  summary: string | null;
  onImport: (file: File) => void;
  onDismissSummary: () => void;
}) {
  return (
    <EducationEditorSection
      title="Import PDF / DOCX"
      description="Dokument koristimo kao izvor za pravljenje uređivog nacrta članka. Originalni dokument se ovim ne objavljuje kao fajl za preuzimanje."
      prominent
    >
      <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/50 px-5 py-6 text-center transition hover:border-violet-500 dark:border-violet-900 dark:bg-violet-950/20">
        <span className="font-semibold text-violet-700 dark:text-violet-300">
          {importing ? "Dokument se čita…" : "Izaberite PDF ili DOCX"}
        </span>
        <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Uvoz pravi nacrt koji zatim uređujete i sami objavljujete.
        </span>
        <input
          type="file"
          className="sr-only"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          disabled={importing}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onImport(file);
          }}
        />
      </label>
      {summary && (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30"
        >
          <span className="text-emerald-900 dark:text-emerald-200">
            {summary} Pregledajte i ispravite sadržaj pre čuvanja.
          </span>
          <button
            type="button"
            onClick={onDismissSummary}
            className="text-xs font-semibold text-emerald-800 underline-offset-4 hover:underline dark:text-emerald-300"
          >
            U redu
          </button>
        </div>
      )}
    </EducationEditorSection>
  );
}

export function EducationCoverSection({
  state,
  mediaAdapter,
  onChange,
}: {
  state: EducationEditorState;
  mediaAdapter?: ContentMediaAuthoringAdapter;
  onChange: (changes: Partial<EducationEditorState>) => void;
}) {
  return (
    <EducationEditorSection
      number="4 · Naslovna slika"
      title="Slika sadržaja"
      description="Prikazuje se na kartici i na vrhu objavljenog sadržaja."
    >
      <ImageMediaField
        label="Naslovna slika"
        adapter={mediaAdapter}
        defaultAlt={state.title}
        aspectHint="16:9"
        image={state.hero.image ? { ...state.hero.image, alt: state.hero.image.alt ?? "" } : undefined}
        onChange={(image) =>
          onChange({
            hero: {
              ...state.hero,
              image: image?.src
                ? {
                    src: image.src,
                    alt: image.alt || undefined,
                    focalPoint: image.focalPoint,
                  }
                : undefined,
            },
          })
        }
      />
    </EducationEditorSection>
  );
}

export function EducationDownloadSection({
  blocks,
  mediaAdapter,
  onChange,
}: {
  blocks: EducationEditorState["blocks"];
  mediaAdapter?: ContentMediaAuthoringAdapter;
  onChange: (blocks: EducationEditorState["blocks"]) => void;
}) {
  return (
    <EducationEditorSection
      number="5 · Opciono"
      title="Materijal za preuzimanje"
      description="Dodajte PDF, checklistu ili drugi fajl koji želite da posetilac preuzme uz ovaj sadržaj. Ovo nije dokument koji ste koristili za uvoz članka."
    >
      <ContentBlocksEditor
        blocks={blocks}
        mediaAdapter={mediaAdapter}
        includeTypes={["FileDownloadBlock"]}
        allowedTypes={["FileDownloadBlock"]}
        quickAddType="FileDownloadBlock"
        addButtonLabel="Dodaj materijal"
        emptyTitle="Nema materijala za preuzimanje"
        emptyHelp="Ovaj deo je opcioni i može ostati prazan."
        onChange={onChange}
      />
    </EducationEditorSection>
  );
}

export function EducationAccessSection({
  state,
  mediaAdapter,
  onChange,
}: {
  state: EducationEditorState;
  mediaAdapter?: ContentMediaAuthoringAdapter;
  onChange: (changes: Partial<EducationEditorState>) => void;
}) {
  return (
    <EducationEditorSection
      number="6 · Pristup / objavljivanje"
      title="Ko može da vidi"
    >
      <fieldset>
        <legend className="sr-only">Ko može da vidi</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {EDUCATION_ACCESS_MODES.map((mode) => (
            <label
              key={mode}
              className={`flex min-h-28 cursor-pointer gap-3 rounded-xl border p-4 text-sm transition ${
                state.accessMode === mode
                  ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500 dark:bg-violet-950/30"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            >
              <input
                type="radio"
                name="accessMode"
                className="mt-0.5 size-4 accent-violet-600"
                checked={state.accessMode === mode}
                onChange={() => onChange({ accessMode: mode })}
              />
              <span>
                <span className="block font-semibold text-gray-900 dark:text-white">
                  {EDUCATION_ACCESS_LABELS[mode]}
                </span>
                <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">
                  {EDUCATION_ACCESS_HELP[mode]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.accessMode === "gated" && (
        <fieldset className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
          <legend className="px-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
            Javni pregled zaključanog sadržaja
          </legend>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            Javnost vidi ovaj preview, dok puni sadržaj zahteva odobren pristup.
          </p>
          <div className="grid gap-3">
            <input
              value={state.publicPreview.title ?? ""}
              onChange={(event) =>
                onChange({
                  publicPreview: { ...state.publicPreview, title: event.target.value },
                })
              }
              placeholder={state.title || "Naslov u pregledu"}
              className={EDUCATION_FIELD_CLASS}
            />
            <textarea
              value={state.publicPreview.description ?? ""}
              onChange={(event) =>
                onChange({
                  publicPreview: {
                    ...state.publicPreview,
                    description: event.target.value,
                  },
                })
              }
              rows={2}
              placeholder={state.hero.subtitle || "Kratak opis koji nagoveštava sadržaj"}
              className={EDUCATION_FIELD_CLASS}
            />
            <AssetMediaField
              kind="image"
              label="Naslovna slika javnog pregleda"
              adapter={mediaAdapter}
              asset={state.publicPreview.coverImage ? { src: state.publicPreview.coverImage } : undefined}
              onChange={(asset) =>
                onChange({
                  publicPreview: {
                    ...state.publicPreview,
                    coverImage: asset?.src,
                  },
                })
              }
            />
          </div>
        </fieldset>
      )}
    </EducationEditorSection>
  );
}

export function EducationAdvancedSettings({
  state,
  slugPreview,
  hasCustomSeo,
  mediaAdapter,
  onChange,
}: {
  state: EducationEditorState;
  slugPreview: string;
  hasCustomSeo: boolean;
  mediaAdapter?: ContentMediaAuthoringAdapter;
  onChange: (changes: Partial<EducationEditorState>) => void;
}) {
  return (
    <Disclosure
      as="section"
      className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <DisclosureButton className="group flex w-full items-center justify-between gap-3 px-5 py-5 text-left sm:px-6">
        <span>
          <span className="text-xs font-bold uppercase tracking-widest text-violet-500">
            7 · Napredna podešavanja
          </span>
          <span className="mt-1 block font-bold text-gray-900 dark:text-white">
            Web adresa i SEO
          </span>
          <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
            {hasCustomSeo ? "Prilagođeni SEO podaci su podešeni." : "Automatske vrednosti su dovoljne za objavu."}
          </span>
        </span>
        <ChevronDownIcon className="size-5 shrink-0 text-gray-500 transition group-data-open:rotate-180" />
      </DisclosureButton>
      <DisclosurePanel className="space-y-5 border-t border-gray-200 px-5 py-5 sm:px-6 dark:border-gray-800">
        <label>
          <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Web adresa
          </span>
          <input
            value={state.slugTouched ? state.slug : slugPreview}
            onChange={(event) => onChange({ slug: event.target.value, slugTouched: true })}
            placeholder="kako-prepoznati-dehidriranu-kozu"
            className={EDUCATION_FIELD_CLASS}
          />
        </label>
        {state.accessMode !== "private" && (
          <div className="grid gap-4">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                SEO naslov
              </span>
              <input
                value={state.seo.title ?? ""}
                onChange={(event) => onChange({ seo: { ...state.seo, title: event.target.value } })}
                placeholder={state.title || "SEO naslov"}
                className={EDUCATION_FIELD_CLASS}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                SEO opis
              </span>
              <textarea
                value={state.seo.description ?? ""}
                onChange={(event) => onChange({ seo: { ...state.seo, description: event.target.value } })}
                rows={3}
                placeholder={state.hero.subtitle || "Kratak opis za pretragu i deljenje"}
                className={EDUCATION_FIELD_CLASS}
              />
            </label>
            <AssetMediaField
              kind="image"
              label="Slika za deljenje"
              adapter={mediaAdapter}
              asset={state.seo.ogImage ? { src: state.seo.ogImage } : undefined}
              onChange={(asset) => onChange({ seo: { ...state.seo, ogImage: asset?.src } })}
            />
          </div>
        )}
      </DisclosurePanel>
    </Disclosure>
  );
}
