"use client";

/**
 * Theme-9 authoring surface — sedam sekcija koje su do sada postojale samo u
 * persistence sloju i u temi, ali ih vlasnica nije mogla urediti. Sadržaj je
 * do sada ulazio jednokratnom seed skriptom; ovo je zamenjuje.
 *
 * DVE GRANICE, namerno:
 *
 * 1. Ovaj fajl NE menja persistence shape. Svako polje ispod već postoji i u
 *    `LandingStructure` tipu i u Mongoose šemi (provereno introspekcijom pre
 *    pisanja: sve ugnežđene putanje ovih sedam blokova su persistovane).
 *    Editor dodaje samo površinu za unos.
 *
 * 2. Redosled sekcija prati `compositionFor("theme-9")` — isti redosled kojim
 *    se blokovi renderuju na stranici, da vlasnica u editoru vidi stranicu
 *    kakva jeste, a ne abecedni spisak.
 *
 * `id` polja se ne izlažu: služe kao React ključevi, a kod `topicHub` i kao
 * veza filtera i tema — zato ih generišemo i držimo stabilnim, dok korisnik
 * bira filter po natpisu.
 */

import type { LandingStructure } from "@/types";
import { ImageInputField, inp, lbl, SectionCard } from "./primitives";

type Landing = LandingStructure["landing"];

export interface Theme9SectionsProps {
  ls: LandingStructure;
  update: <K extends keyof Landing>(section: K, value: Landing[K]) => void;
}

// ─── Sitni pomoćnici ─────────────────────────────────────────────────────────

function Text({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      <input
        className={inp}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      <textarea
        className={inp + " resize-none"}
        rows={rows}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

/** Niz kratkih stringova se uređuje kao „jedan po redu" — isti idiom kao theme-8 marquee. */
function Lines({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value?: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      <textarea
        className={inp + " resize-none"}
        rows={rows}
        value={(value ?? []).join("\n")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          )
        }
        placeholder={placeholder}
      />
      <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
        Jedna stavka po redu.
      </p>
    </div>
  );
}

function Item({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">{children}</div>
        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
        >
          −
        </button>
      </div>
    </div>
  );
}

function Add({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
    >
      {label}
    </button>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2">
      {children}
    </p>
  );
}

/** Stabilan interni ključ; korisnik ga ne vidi ni ne menja. */
function makeId(prefix: string, taken: (string | undefined)[]): string {
  let n = taken.length + 1;
  while (taken.includes(prefix + "-" + n)) n += 1;
  return prefix + "-" + n;
}

/**
 * PRIVREMENO — 2B korak 5 („CMS tri-state presentation") ovo zamenjuje.
 *
 * `enabled` je od 2B koraka 1 tri-state, a `SectionCard` zna samo za dva
 * stanja. Dok ne dobije treće, prekidač prikazuje odsustvo odluke kao
 * isključeno. To je ISTO ponašanje kao pre tri-state izmene (šema je tada
 * materijalizovala `false`), pa ovo ne uvodi regresiju — ali jeste privremeno
 * netačno i ne sme se isporučiti bez koraka 5.
 */
function toggleState(enabled?: boolean): boolean {
  return enabled ?? false;
}

// ─── 1. audiencePaths ────────────────────────────────────────────────────────

type AudiencePaths = NonNullable<Landing["audiencePaths"]>;
type AudiencePathItem = NonNullable<AudiencePaths["paths"]>[number];

export function AudiencePathsEditor({ ls, update }: Theme9SectionsProps) {
  const block: AudiencePaths = ls.landing.audiencePaths ?? { enabled: true };
  const paths = block.paths ?? [];
  const setPaths = (next: AudiencePathItem[]) =>
    update("audiencePaths", { ...block, paths: next });

  return (
    <SectionCard
      title="Theme-9 / Putanje za posetioce"
      badge="theme-9"
      tone="odd"
      enabled={toggleState(block.enabled)}
      onToggle={(v) => update("audiencePaths", { ...block, enabled: v })}
    >
      <Hint>
        Prva sekcija ispod hero-a. Razdvaja posetioce po nameri — na primer
        „želim negu za sebe“ naspram „želim da se edukujem“.
      </Hint>
      <div className="grid grid-cols-2 gap-3">
        <Text
          label="Nadnaslov"
          value={block.eyebrow}
          onChange={(v) => update("audiencePaths", { ...block, eyebrow: v })}
          placeholder="Odakle da krenete"
        />
        <Text
          label="Naslov"
          value={block.headline}
          onChange={(v) => update("audiencePaths", { ...block, headline: v })}
          placeholder="Dve putanje, jedan pristup"
        />
      </div>
      <Area
        label="Uvodni tekst"
        value={block.lead}
        onChange={(v) => update("audiencePaths", { ...block, lead: v })}
      />

      <div className="space-y-3">
        <label className={lbl}>Putanje</label>
        {paths.map((path, i) => {
          const patch = (change: Partial<AudiencePathItem>) => {
            const next = [...paths];
            next[i] = { ...path, ...change };
            setPaths(next);
          };
          return (
            <Item
              key={path.id ?? i}
              onRemove={() => setPaths(paths.filter((_, idx) => idx !== i))}
            >
              <div className="grid grid-cols-2 gap-2">
                <Text
                  label="Oznaka"
                  value={path.chip}
                  onChange={(v) => patch({ chip: v })}
                  placeholder="Nega kože"
                />
                <Text
                  label="Naslov"
                  value={path.title}
                  onChange={(v) => patch({ title: v })}
                  placeholder="Za vas lično"
                />
              </div>
              <Area
                label="Opis"
                value={path.lead}
                onChange={(v) => patch({ lead: v })}
              />
              <Lines
                label="Stavke"
                value={path.bullets}
                onChange={(v) => patch({ bullets: v })}
                placeholder={"Analiza kože\nPlan nege\nKontrola"}
              />
              <div className="grid grid-cols-3 gap-2">
                <Text
                  label="Link"
                  value={path.href}
                  onChange={(v) => patch({ href: v })}
                  placeholder="/termini"
                />
                <Text
                  label="Tekst dugmeta"
                  value={path.ctaLabel}
                  onChange={(v) => patch({ ctaLabel: v })}
                  placeholder="Zakažite konsultaciju"
                />
                <div>
                  <label className={lbl}>Izgled</label>
                  <select
                    className={inp}
                    value={path.tone ?? "surface"}
                    onChange={(e) =>
                      patch({ tone: e.target.value as AudiencePathItem["tone"] })
                    }
                  >
                    <option value="surface">Svetla kartica</option>
                    <option value="accent">Naglašena kartica</option>
                  </select>
                </div>
              </div>
            </Item>
          );
        })}
        <Add
          label="+ Dodaj putanju"
          onClick={() =>
            setPaths([
              ...paths,
              {
                id: makeId("path", paths.map((p) => p.id)),
                title: "",
                tone: "surface",
              },
            ])
          }
        />
      </div>
    </SectionCard>
  );
}

// ─── 2. topicHub ─────────────────────────────────────────────────────────────

type TopicHub = NonNullable<Landing["topicHub"]>;
type TopicHubTopic = NonNullable<TopicHub["topics"]>[number];

export function TopicHubEditor({ ls, update }: Theme9SectionsProps) {
  const block: TopicHub = ls.landing.topicHub ?? { enabled: true };
  const filters = block.filters ?? [];
  const topics = block.topics ?? [];

  return (
    <SectionCard
      title="Theme-9 / Centar tema"
      badge="theme-9"
      tone="even"
      enabled={toggleState(block.enabled)}
      onToggle={(v) => update("topicHub", { ...block, enabled: v })}
    >
      <Hint>
        Spisak tema koje posetilac može da filtrira. Svaka tema pripada jednoj
        grupi; grupe se definišu ispod kao filteri.
      </Hint>
      <div className="grid grid-cols-2 gap-3">
        <Text
          label="Nadnaslov"
          value={block.eyebrow}
          onChange={(v) => update("topicHub", { ...block, eyebrow: v })}
          placeholder="Teme"
        />
        <Text
          label="Naslov"
          value={block.headline}
          onChange={(v) => update("topicHub", { ...block, headline: v })}
          placeholder="Šta vas zanima"
        />
      </div>

      <div className="space-y-3">
        <label className={lbl}>Filteri</label>
        {filters.map((filter, i) => (
          <Item
            key={filter.id ?? i}
            onRemove={() => {
              const removed = filter.id;
              update("topicHub", {
                ...block,
                filters: filters.filter((_, idx) => idx !== i),
                // Teme koje su pripadale obrisanom filteru ostaju bez grupe,
                // umesto da pokazuju na nepostojeći filter i nestanu iz prikaza.
                topics: topics.map((t) =>
                  t.group === removed ? { ...t, group: undefined } : t,
                ),
              });
            }}
          >
            <Text
              label="Natpis filtera"
              value={filter.label}
              onChange={(v) => {
                const next = [...filters];
                next[i] = { ...filter, label: v };
                update("topicHub", { ...block, filters: next });
              }}
              placeholder="Nega kože"
            />
          </Item>
        ))}
        <Add
          label="+ Dodaj filter"
          onClick={() =>
            update("topicHub", {
              ...block,
              filters: [
                ...filters,
                { id: makeId("filter", filters.map((f) => f.id)), label: "" },
              ],
            })
          }
        />
      </div>

      <div className="space-y-3">
        <label className={lbl}>Teme</label>
        {topics.map((topic, i) => {
          const patch = (change: Partial<TopicHubTopic>) => {
            const next = [...topics];
            next[i] = { ...topic, ...change };
            update("topicHub", { ...block, topics: next });
          };
          return (
            <Item
              key={topic.id ?? i}
              onRemove={() =>
                update("topicHub", {
                  ...block,
                  topics: topics.filter((_, idx) => idx !== i),
                })
              }
            >
              <div className="grid grid-cols-2 gap-2">
                <Text
                  label="Naslov"
                  value={topic.title}
                  onChange={(v) => patch({ title: v })}
                  placeholder="Rutina za osetljivu kožu"
                />
                <div>
                  <label className={lbl}>Grupa</label>
                  <select
                    className={inp}
                    value={topic.group ?? ""}
                    onChange={(e) =>
                      patch({ group: e.target.value || undefined })
                    }
                  >
                    <option value="">Bez grupe</option>
                    {filters.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label || f.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Area
                label="Opis"
                value={topic.lead}
                onChange={(v) => patch({ lead: v })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Lines
                  label="Tagovi"
                  value={topic.tags}
                  onChange={(v) => patch({ tags: v })}
                  rows={2}
                  placeholder={"akne\nbarijera"}
                />
                <Text
                  label="Link"
                  value={topic.href}
                  onChange={(v) => patch({ href: v })}
                  placeholder="/blog/rutina"
                />
              </div>
            </Item>
          );
        })}
        <Add
          label="+ Dodaj temu"
          onClick={() =>
            update("topicHub", {
              ...block,
              topics: [
                ...topics,
                { id: makeId("topic", topics.map((t) => t.id)), title: "" },
              ],
            })
          }
        />
      </div>
    </SectionCard>
  );
}

// ─── 3. featuredEducation ────────────────────────────────────────────────────

type FeaturedEducation = NonNullable<Landing["featuredEducation"]>;

export function FeaturedEducationEditor({ ls, update }: Theme9SectionsProps) {
  const block: FeaturedEducation = ls.landing.featuredEducation ?? {
    enabled: true,
  };
  const details = block.details ?? {};

  return (
    <SectionCard
      title="Theme-9 / Istaknuta edukacija"
      badge="theme-9"
      tone="odd"
      enabled={toggleState(block.enabled)}
      onToggle={(v) => update("featuredEducation", { ...block, enabled: v })}
    >
      <Hint>
        Jedan istaknut program. Detalj koji ostavite prazan prikazuje se kao
        napomena ispod („još nije potvrđeno“), pa nema izmišljenih podataka.
      </Hint>
      <div className="grid grid-cols-2 gap-3">
        <Text
          label="Nadnaslov"
          value={block.eyebrow}
          onChange={(v) => update("featuredEducation", { ...block, eyebrow: v })}
          placeholder="Edukacija"
        />
        <Text
          label="Oznaka stanja"
          value={block.status}
          onChange={(v) => update("featuredEducation", { ...block, status: v })}
          placeholder="U pripremi"
        />
      </div>
      <Text
        label="Naslov"
        value={block.headline}
        onChange={(v) => update("featuredEducation", { ...block, headline: v })}
      />
      <Area
        label="Uvodni tekst"
        value={block.lead}
        onChange={(v) => update("featuredEducation", { ...block, lead: v })}
      />
      <Lines
        label="Šta polaznik uči"
        value={block.learn}
        onChange={(v) => update("featuredEducation", { ...block, learn: v })}
        rows={4}
      />

      <div className="grid grid-cols-2 gap-3">
        <Text
          label="Format"
          value={details.format}
          onChange={(v) =>
            update("featuredEducation", {
              ...block,
              details: { ...details, format: v },
            })
          }
          placeholder="Uživo, mala grupa"
        />
        <Text
          label="Trajanje"
          value={details.duration}
          onChange={(v) =>
            update("featuredEducation", {
              ...block,
              details: { ...details, duration: v },
            })
          }
          placeholder="2 dana"
        />
        <Text
          label="Početak"
          value={details.startDate}
          onChange={(v) =>
            update("featuredEducation", {
              ...block,
              details: { ...details, startDate: v },
            })
          }
          placeholder="Mart 2027."
        />
        <Text
          label="Cena"
          value={details.price}
          onChange={(v) =>
            update("featuredEducation", {
              ...block,
              details: { ...details, price: v },
            })
          }
          placeholder="Ostavite prazno dok nije potvrđena"
        />
      </div>

      <Text
        label="Napomena za nepotvrđene detalje"
        value={block.pendingLabel}
        onChange={(v) =>
          update("featuredEducation", { ...block, pendingLabel: v })
        }
        placeholder="Uskoro"
      />

      <div className="grid grid-cols-2 gap-3">
        <Text
          label="Tekst dugmeta"
          value={block.cta?.text}
          onChange={(v) =>
            update("featuredEducation", {
              ...block,
              cta: { text: v, href: block.cta?.href ?? "" },
            })
          }
          placeholder="Prijavite interesovanje"
        />
        <Text
          label="Link dugmeta"
          value={block.cta?.href}
          onChange={(v) =>
            update("featuredEducation", {
              ...block,
              cta: { text: block.cta?.text ?? "", href: v },
            })
          }
          placeholder="/kontakt"
        />
      </div>
      <Area
        label="Napomena"
        value={block.note}
        onChange={(v) => update("featuredEducation", { ...block, note: v })}
      />
    </SectionCard>
  );
}

// ─── 4. guidedCareProcess ────────────────────────────────────────────────────

type GuidedCareProcess = NonNullable<Landing["guidedCareProcess"]>;
type GuidedCareStep = NonNullable<GuidedCareProcess["steps"]>[number];

export function GuidedCareProcessEditor({ ls, update }: Theme9SectionsProps) {
  const block: GuidedCareProcess = ls.landing.guidedCareProcess ?? {
    enabled: true,
  };
  const steps = block.steps ?? [];

  return (
    <SectionCard
      title="Theme-9 / Vođeni proces nege"
      badge="theme-9"
      tone="even"
      enabled={toggleState(block.enabled)}
      onToggle={(v) => update("guidedCareProcess", { ...block, enabled: v })}
    >
      <Hint>Koraci kroz koje klijentkinja prolazi, redom.</Hint>
      <div className="grid grid-cols-2 gap-3">
        <Text
          label="Nadnaslov"
          value={block.eyebrow}
          onChange={(v) => update("guidedCareProcess", { ...block, eyebrow: v })}
          placeholder="Kako radim"
        />
        <Text
          label="Naslov"
          value={block.headline}
          onChange={(v) =>
            update("guidedCareProcess", { ...block, headline: v })
          }
        />
      </div>
      <Area
        label="Uvodni tekst"
        value={block.lead}
        onChange={(v) => update("guidedCareProcess", { ...block, lead: v })}
      />

      <div className="space-y-3">
        <label className={lbl}>Koraci</label>
        {steps.map((step, i) => {
          const patch = (change: Partial<GuidedCareStep>) => {
            const next = [...steps];
            next[i] = { ...step, ...change };
            update("guidedCareProcess", { ...block, steps: next });
          };
          return (
            <Item
              key={i}
              onRemove={() =>
                update("guidedCareProcess", {
                  ...block,
                  steps: steps.filter((_, idx) => idx !== i),
                })
              }
            >
              <Text
                label={"Korak " + (i + 1)}
                value={step.title}
                onChange={(v) => patch({ title: v })}
                placeholder="Analiza kože"
              />
              <Area
                label="Opis"
                value={step.text}
                onChange={(v) => patch({ text: v })}
              />
            </Item>
          );
        })}
        <Add
          label="+ Dodaj korak"
          onClick={() =>
            update("guidedCareProcess", {
              ...block,
              steps: [...steps, { title: "" }],
            })
          }
        />
      </div>
    </SectionCard>
  );
}

// ─── 5. professionalPath ─────────────────────────────────────────────────────

type ProfessionalPath = NonNullable<Landing["professionalPath"]>;
type ProfessionalFormat = NonNullable<ProfessionalPath["formats"]>[number];

export function ProfessionalPathEditor({ ls, update }: Theme9SectionsProps) {
  const block: ProfessionalPath = ls.landing.professionalPath ?? {
    enabled: true,
  };
  const formats = block.formats ?? [];

  return (
    <SectionCard
      title="Theme-9 / Profesionalni put"
      badge="theme-9"
      tone="odd"
      enabled={toggleState(block.enabled)}
      onToggle={(v) => update("professionalPath", { ...block, enabled: v })}
    >
      <Hint>
        Ponuda za kolege iz struke. Cena se ostavlja praznom dok nije potvrđena
        — prazno polje se ne prikazuje.
      </Hint>
      <div className="grid grid-cols-2 gap-3">
        <Text
          label="Nadnaslov"
          value={block.eyebrow}
          onChange={(v) => update("professionalPath", { ...block, eyebrow: v })}
          placeholder="Za kolege"
        />
        <Text
          label="Naslov"
          value={block.headline}
          onChange={(v) => update("professionalPath", { ...block, headline: v })}
        />
      </div>
      <Area
        label="Uvodni tekst"
        value={block.lead}
        onChange={(v) => update("professionalPath", { ...block, lead: v })}
      />

      <div className="space-y-3">
        <label className={lbl}>Formati</label>
        {formats.map((format, i) => {
          const patch = (change: Partial<ProfessionalFormat>) => {
            const next = [...formats];
            next[i] = { ...format, ...change };
            update("professionalPath", { ...block, formats: next });
          };
          return (
            <Item
              key={i}
              onRemove={() =>
                update("professionalPath", {
                  ...block,
                  formats: formats.filter((_, idx) => idx !== i),
                })
              }
            >
              <div className="grid grid-cols-3 gap-2">
                <Text
                  label="Vrsta"
                  value={format.kind}
                  onChange={(v) => patch({ kind: v })}
                  placeholder="Radionica"
                />
                <Text
                  label="Naslov"
                  value={format.title}
                  onChange={(v) => patch({ title: v })}
                />
                <Text
                  label="Cena od"
                  value={format.priceFrom}
                  onChange={(v) => patch({ priceFrom: v })}
                  placeholder="dogovor po timu"
                />
              </div>
              <Area
                label="Opis"
                value={format.text}
                onChange={(v) => patch({ text: v })}
              />
            </Item>
          );
        })}
        <Add
          label="+ Dodaj format"
          onClick={() =>
            update("professionalPath", {
              ...block,
              formats: [...formats, { title: "" }],
            })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Text
          label="Tekst dugmeta"
          value={block.cta?.text}
          onChange={(v) =>
            update("professionalPath", {
              ...block,
              cta: { text: v, href: block.cta?.href ?? "" },
            })
          }
        />
        <Text
          label="Link dugmeta"
          value={block.cta?.href}
          onChange={(v) =>
            update("professionalPath", {
              ...block,
              cta: { text: block.cta?.text ?? "", href: v },
            })
          }
        />
      </div>
      <Area
        label="Napomena"
        value={block.note}
        onChange={(v) => update("professionalPath", { ...block, note: v })}
      />
    </SectionCard>
  );
}

// ─── 6. credentials ──────────────────────────────────────────────────────────

type Credentials = NonNullable<Landing["credentials"]>;
type CredentialPillar = NonNullable<Credentials["pillars"]>[number];
type CredentialImage = NonNullable<
  NonNullable<Credentials["social"]>["images"]
>[number];

export function CredentialsEditor({ ls, update }: Theme9SectionsProps) {
  const block: Credentials = ls.landing.credentials ?? { enabled: true };
  const pillars = block.pillars ?? [];
  const social = block.social ?? {};
  const images = social.images ?? [];

  const setSocial = (change: Partial<NonNullable<Credentials["social"]>>) =>
    update("credentials", { ...block, social: { ...social, ...change } });

  return (
    <SectionCard
      title="Theme-9 / Zašto baš ona"
      badge="theme-9"
      tone="even"
      enabled={toggleState(block.enabled)}
      onToggle={(v) => update("credentials", { ...block, enabled: v })}
    >
      <Hint>
        Stubovi poverenja. Ovo NIJE tabela obrazovanja iz sekcije „O nama“ —
        ovde idu razlozi zašto baš ona, a tamo suvi spisak uz biografiju.
      </Hint>
      <div className="grid grid-cols-2 gap-3">
        <Text
          label="Nadnaslov"
          value={block.eyebrow}
          onChange={(v) => update("credentials", { ...block, eyebrow: v })}
        />
        <Text
          label="Naslov"
          value={block.headline}
          onChange={(v) => update("credentials", { ...block, headline: v })}
        />
      </div>
      <Area
        label="Uvodni tekst"
        value={block.lead}
        onChange={(v) => update("credentials", { ...block, lead: v })}
      />

      <div className="space-y-3">
        <label className={lbl}>Stubovi</label>
        {pillars.map((pillar, i) => {
          const patch = (change: Partial<CredentialPillar>) => {
            const next = [...pillars];
            next[i] = { ...pillar, ...change };
            update("credentials", { ...block, pillars: next });
          };
          return (
            <Item
              key={i}
              onRemove={() =>
                update("credentials", {
                  ...block,
                  pillars: pillars.filter((_, idx) => idx !== i),
                })
              }
            >
              <Text
                label="Naslov"
                value={pillar.title}
                onChange={(v) => patch({ title: v })}
              />
              <Area
                label="Opis"
                value={pillar.text}
                onChange={(v) => patch({ text: v })}
              />
            </Item>
          );
        })}
        <Add
          label="+ Dodaj stub"
          onClick={() =>
            update("credentials", {
              ...block,
              pillars: [...pillars, { title: "" }],
            })
          }
        />
      </div>

      <div className="space-y-3">
        <label className={lbl}>Društvene mreže</label>
        <div className="grid grid-cols-2 gap-3">
          <Text
            label="Oznaka"
            value={social.label}
            onChange={(v) => setSocial({ label: v })}
            placeholder="Instagram"
          />
          <Text
            label="Naslov"
            value={social.title}
            onChange={(v) => setSocial({ title: v })}
          />
          <Text
            label="Tekst linka"
            value={social.linkLabel}
            onChange={(v) => setSocial({ linkLabel: v })}
            placeholder="Pratite rad"
          />
          <Text
            label="Adresa"
            value={social.url}
            onChange={(v) => setSocial({ url: v })}
            placeholder="https://instagram.com/..."
          />
        </div>

        {images.map((image, i) => {
          const patch = (change: Partial<CredentialImage>) => {
            const next = [...images];
            next[i] = { ...image, ...change };
            setSocial({ images: next });
          };
          return (
            <Item
              key={i}
              onRemove={() =>
                setSocial({ images: images.filter((_, idx) => idx !== i) })
              }
            >
              <ImageInputField
                label="Slika"
                value={image.src ?? ""}
                onChange={(url) => patch({ src: url })}
              />
              <Text
                label="Alt tekst"
                value={image.alt}
                onChange={(v) => patch({ alt: v })}
              />
            </Item>
          );
        })}
        <Add
          label="+ Dodaj sliku"
          onClick={() => setSocial({ images: [...images, { src: "", alt: "" }] })}
        />
      </div>

      <Area
        label="Napomena"
        value={block.note}
        onChange={(v) => update("credentials", { ...block, note: v })}
      />
    </SectionCard>
  );
}

// ─── 7. finalCta ─────────────────────────────────────────────────────────────

type FinalCta = NonNullable<Landing["finalCta"]>;
type FinalCtaSlot = NonNullable<
  NonNullable<FinalCta["calendar"]>["slots"]
>[number];

export function FinalCtaEditor({ ls, update }: Theme9SectionsProps) {
  const block: FinalCta = ls.landing.finalCta ?? { enabled: true };
  const calendar = block.calendar ?? {};
  const slots = calendar.slots ?? [];

  const setCalendar = (change: Partial<NonNullable<FinalCta["calendar"]>>) =>
    update("finalCta", { ...block, calendar: { ...calendar, ...change } });

  return (
    <SectionCard
      title="Theme-9 / Završni poziv"
      badge="theme-9"
      tone="odd"
      enabled={toggleState(block.enabled)}
      onToggle={(v) => update("finalCta", { ...block, enabled: v })}
    >
      <Hint>
        Poslednja sekcija stranice. Termini ispod su ILUSTRACIJA uz poziv na
        akciju — ručno upisan tekst, a ne stvarna dostupnost iz kalendara.
        Zakazivanje i dalje ide preko dugmeta.
      </Hint>
      <div className="grid grid-cols-2 gap-3">
        <Text
          label="Nadnaslov"
          value={block.eyebrow}
          onChange={(v) => update("finalCta", { ...block, eyebrow: v })}
        />
        <Text
          label="Naslov"
          value={block.headline}
          onChange={(v) => update("finalCta", { ...block, headline: v })}
        />
      </div>
      <Area
        label="Uvodni tekst"
        value={block.lead}
        onChange={(v) => update("finalCta", { ...block, lead: v })}
      />

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Text
            label="Naslov iznad termina"
            value={calendar.label}
            onChange={(v) => setCalendar({ label: v })}
            placeholder="Slobodni termini"
          />
          <Text
            label="Mesec"
            value={calendar.month}
            onChange={(v) => setCalendar({ month: v })}
            placeholder="Septembar"
          />
        </div>

        <label className={lbl}>Prikazani termini</label>
        {slots.map((slot, i) => {
          const patch = (change: Partial<FinalCtaSlot>) => {
            const next = [...slots];
            next[i] = { ...slot, ...change };
            setCalendar({ slots: next });
          };
          return (
            <Item
              key={i}
              onRemove={() =>
                setCalendar({ slots: slots.filter((_, idx) => idx !== i) })
              }
            >
              <div className="grid grid-cols-3 gap-2 items-end">
                <Text
                  label="Dan"
                  value={slot.day}
                  onChange={(v) => patch({ day: v })}
                  placeholder="uto 12."
                />
                <Text
                  label="Vreme"
                  value={slot.time}
                  onChange={(v) => patch({ time: v })}
                  placeholder="10:00"
                />
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 pb-2.5">
                  <input
                    type="checkbox"
                    checked={slot.selected ?? false}
                    onChange={(e) => patch({ selected: e.target.checked })}
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-400"
                  />
                  Istaknut
                </label>
              </div>
            </Item>
          );
        })}
        <Add
          label="+ Dodaj termin"
          onClick={() => setCalendar({ slots: [...slots, { day: "", time: "" }] })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Text
          label="Tekst dugmeta"
          value={block.ctaLabel}
          onChange={(v) => update("finalCta", { ...block, ctaLabel: v })}
          placeholder="Otvorite zakazivanje"
        />
        <Text
          label="Napomena"
          value={block.note}
          onChange={(v) => update("finalCta", { ...block, note: v })}
        />
      </div>
    </SectionCard>
  );
}

// ─── Omotač ──────────────────────────────────────────────────────────────────

/**
 * Redosled prati `compositionFor("theme-9")`: audiencePaths → about →
 * topicHub → featuredEducation → guidedCareProcess → professionalPath →
 * credentials → blog → finalCta. `about` i `blog` uređuje glavni editor, pa
 * ovde ostaje sedam sekcija u istim međusobnim odnosima.
 */
export function Theme9Sections(props: Theme9SectionsProps) {
  return (
    <>
      <AudiencePathsEditor {...props} />
      <TopicHubEditor {...props} />
      <FeaturedEducationEditor {...props} />
      <GuidedCareProcessEditor {...props} />
      <ProfessionalPathEditor {...props} />
      <CredentialsEditor {...props} />
      <FinalCtaEditor {...props} />
    </>
  );
}
