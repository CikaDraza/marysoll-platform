"use client";

// Deterministic manual editor for AI-generated landing blocks.
// Edits text, CTA (label + destination), order and visibility, then writes the
// blocks straight back to the layout — no AI regeneration, so the user's
// changes are always preserved exactly.

import {
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { LandingBlock } from "@/types/landing-blocks";
import {
  resolveCta,
  getCtaKeyOptions,
  type CustomCta,
} from "@/lib/ai/landing/ctaCatalog";

const BLOCK_LABEL: Record<LandingBlock["type"], string> = {
  HeroBlock: "Hero",
  ArticleBlock: "Članak",
  FeatureBlock: "Karakteristike",
  ContentSplitBlock: "Sadržaj (split)",
  PricingBlock: "Cenovnik",
  AffiliateCTABlock: "Finalni CTA",
};

const inputCls =
  "w-full rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 p-2 text-sm";
const labelCls =
  "block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1";

function Field({
  label,
  value,
  onChange,
  textarea,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {textarea ? (
        <textarea
          className={inputCls}
          rows={rows ?? 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function CtaField({
  ctaLabel,
  ctaKey,
  options,
  onLabel,
  onKey,
}: {
  ctaLabel: string;
  ctaKey?: string;
  options: { key: string; label: string }[];
  onLabel: (v: string) => void;
  onKey: (k: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[120px] flex-1">
        <label className={labelCls}>CTA — tekst</label>
        <input
          type="text"
          className={inputCls}
          value={ctaLabel}
          onChange={(e) => onLabel(e.target.value)}
        />
      </div>
      <div className="min-w-[140px] flex-1">
        <label className={labelCls}>Vodi na</label>
        <select
          className={inputCls}
          value={ctaKey ?? ""}
          onChange={(e) => onKey(e.target.value)}
        >
          <option value="" disabled>
            Izaberi destinaciju…
          </option>
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

interface Props {
  blocks: LandingBlock[];
  customCtas: CustomCta[];
  onChange: (blocks: LandingBlock[]) => void;
}

export function LandingBlocksEditor({ blocks, customCtas, onChange }: Props) {
  const validCustomCtas = customCtas.filter(
    (c) => c.label?.trim() && c.href?.trim(),
  );
  const ctaOptions = getCtaKeyOptions(validCustomCtas);

  const replaceAt = (index: number, block: LandingBlock) =>
    onChange(blocks.map((b, i) => (i === index ? block : b)));

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next.map((b, i) => ({ ...b, priority: i + 1 }) as LandingBlock));
  };

  const toggleHidden = (index: number) =>
    replaceAt(index, {
      ...blocks[index],
      visibility:
        blocks[index].visibility === "hidden" ? "visible" : "hidden",
    } as LandingBlock);

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Nema blokova za uređivanje — prvo generišite landing.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const hidden = block.visibility === "hidden";
        return (
          <div
            key={block.id ?? i}
            className={`rounded-lg border border-gray-200 p-3 dark:border-gray-700 ${
              hidden ? "opacity-50" : ""
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                {BLOCK_LABEL[block.type]}
              </span>
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded p-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                  aria-label="Pomeri gore"
                >
                  <ArrowUpIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === blocks.length - 1}
                  className="rounded p-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                  aria-label="Pomeri dole"
                >
                  <ArrowDownIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleHidden(i)}
                  className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label={hidden ? "Prikaži" : "Sakrij"}
                >
                  {hidden ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {block.type === "HeroBlock" && (
                <>
                  <Field
                    label="Naslov"
                    value={block.title}
                    onChange={(v) => replaceAt(i, { ...block, title: v })}
                  />
                  <Field
                    label="Podnaslov"
                    value={block.subtitle ?? ""}
                    onChange={(v) => replaceAt(i, { ...block, subtitle: v })}
                  />
                  <CtaField
                    ctaLabel={block.ctaLabel ?? ""}
                    ctaKey={block.ctaKey}
                    options={ctaOptions}
                    onLabel={(v) => replaceAt(i, { ...block, ctaLabel: v })}
                    onKey={(k) => {
                      const r = resolveCta(k, validCustomCtas);
                      replaceAt(i, {
                        ...block,
                        ctaKey: r.key,
                        href: r.href,
                        ctaLabel: block.ctaLabel || r.label,
                      });
                    }}
                  />
                </>
              )}

              {block.type === "ArticleBlock" && (
                <>
                  <Field
                    label="Naslov"
                    value={block.title}
                    onChange={(v) => replaceAt(i, { ...block, title: v })}
                  />
                  <Field
                    label="Pasusi (jedan po redu)"
                    textarea
                    rows={4}
                    value={block.paragraphs.join("\n")}
                    onChange={(v) =>
                      replaceAt(i, { ...block, paragraphs: v.split("\n") })
                    }
                  />
                </>
              )}

              {block.type === "ContentSplitBlock" && (
                <>
                  <Field
                    label="Naslov"
                    value={block.title}
                    onChange={(v) => replaceAt(i, { ...block, title: v })}
                  />
                  <Field
                    label="Sadržaj"
                    textarea
                    rows={4}
                    value={block.content}
                    onChange={(v) => replaceAt(i, { ...block, content: v })}
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={!!block.reverse}
                      onChange={(e) =>
                        replaceAt(i, { ...block, reverse: e.target.checked })
                      }
                    />
                    Obrnuti raspored (slika desno)
                  </label>
                </>
              )}

              {block.type === "FeatureBlock" && (
                <>
                  <Field
                    label="Naslov"
                    value={block.title}
                    onChange={(v) => replaceAt(i, { ...block, title: v })}
                  />
                  <Field
                    label="Uvod"
                    value={block.intro ?? ""}
                    onChange={(v) => replaceAt(i, { ...block, intro: v })}
                  />
                  {block.sections.map((sec, si) => (
                    <div
                      key={si}
                      className="space-y-2 rounded border border-gray-200 p-2 dark:border-gray-700"
                    >
                      <Field
                        label={`Sekcija ${si + 1} — naslov`}
                        value={sec.title}
                        onChange={(v) =>
                          replaceAt(i, {
                            ...block,
                            sections: block.sections.map((s, idx) =>
                              idx === si ? { ...s, title: v } : s,
                            ),
                          })
                        }
                      />
                      <Field
                        label="Pasusi (jedan po redu)"
                        textarea
                        rows={3}
                        value={sec.paragraphs.join("\n")}
                        onChange={(v) =>
                          replaceAt(i, {
                            ...block,
                            sections: block.sections.map((s, idx) =>
                              idx === si
                                ? { ...s, paragraphs: v.split("\n") }
                                : s,
                            ),
                          })
                        }
                      />
                    </div>
                  ))}
                </>
              )}

              {block.type === "PricingBlock" && (
                <>
                  <Field
                    label="Naslov"
                    value={block.title}
                    onChange={(v) => replaceAt(i, { ...block, title: v })}
                  />
                  <Field
                    label="Opis"
                    value={block.description ?? ""}
                    onChange={(v) => replaceAt(i, { ...block, description: v })}
                  />
                  {block.items.map((item, ii) => (
                    <div
                      key={ii}
                      className="space-y-2 rounded border border-gray-200 p-2 dark:border-gray-700"
                    >
                      <Field
                        label={`Paket ${ii + 1} — naziv`}
                        value={item.title}
                        onChange={(v) =>
                          replaceAt(i, {
                            ...block,
                            items: block.items.map((it, idx) =>
                              idx === ii ? { ...it, title: v } : it,
                            ),
                          })
                        }
                      />
                      <Field
                        label="Opis"
                        value={item.description ?? ""}
                        onChange={(v) =>
                          replaceAt(i, {
                            ...block,
                            items: block.items.map((it, idx) =>
                              idx === ii ? { ...it, description: v } : it,
                            ),
                          })
                        }
                      />
                      <CtaField
                        ctaLabel={item.ctaLabel ?? ""}
                        ctaKey={item.ctaKey}
                        options={ctaOptions}
                        onLabel={(v) =>
                          replaceAt(i, {
                            ...block,
                            items: block.items.map((it, idx) =>
                              idx === ii ? { ...it, ctaLabel: v } : it,
                            ),
                          })
                        }
                        onKey={(k) => {
                          const r = resolveCta(k, validCustomCtas);
                          replaceAt(i, {
                            ...block,
                            items: block.items.map((it, idx) =>
                              idx === ii
                                ? {
                                    ...it,
                                    ctaKey: r.key,
                                    href: r.href,
                                    ctaLabel: it.ctaLabel || r.label,
                                  }
                                : it,
                            ),
                          });
                        }}
                      />
                    </div>
                  ))}
                </>
              )}

              {block.type === "AffiliateCTABlock" && (
                <>
                  <Field
                    label="Eyebrow"
                    value={block.eyebrow ?? ""}
                    onChange={(v) => replaceAt(i, { ...block, eyebrow: v })}
                  />
                  <Field
                    label="Naslov"
                    value={block.title}
                    onChange={(v) => replaceAt(i, { ...block, title: v })}
                  />
                  <Field
                    label="Opis"
                    textarea
                    rows={2}
                    value={block.description ?? ""}
                    onChange={(v) => replaceAt(i, { ...block, description: v })}
                  />
                  <CtaField
                    ctaLabel={block.ctaLabel}
                    ctaKey={block.ctaKey}
                    options={ctaOptions}
                    onLabel={(v) => replaceAt(i, { ...block, ctaLabel: v })}
                    onKey={(k) => {
                      const r = resolveCta(k, validCustomCtas);
                      replaceAt(i, {
                        ...block,
                        ctaKey: r.key,
                        href: r.href,
                        ctaLabel: block.ctaLabel || r.label,
                      });
                    }}
                  />
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
