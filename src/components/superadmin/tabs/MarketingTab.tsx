"use client";

import { useState } from "react";
import {
  useMarketingCms,
  useCmsPages,
  type TypoFixState,
} from "@/hooks/useMarketingCms";
import type {
  CmsPage,
  PerformanceSeoSnapshot,
} from "@/types/marketing-landing";
import { SingleImageField } from "@/components/admin/campaign/SingleImageField";
import { SeoFindings } from "@/components/seo/SeoFindings";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
  superAdminPrimaryButtonClass as btnPrimary,
  superAdminDangerButtonClass as btnDanger,
} from "@/components/superadmin/shared";

// ─── SEO Score Badge ──────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-emerald-900/60 text-emerald-400 border-emerald-700"
      : score >= 50
        ? "bg-amber-900/60 text-amber-400 border-amber-700"
        : "bg-red-900/60 text-red-400 border-red-700";
  return (
    <span
      className={`text-sm font-bold px-3 py-1 rounded-full border ${color}`}
    >
      SEO {score}/100
    </span>
  );
}

const PERFORMANCE_FIELDS: {
  key: keyof PerformanceSeoSnapshot;
  label: string;
  suffix: string;
  placeholder: string;
}[] = [
  {
    key: "realExperienceScore",
    label: "Real Experience Score",
    suffix: "",
    placeholder: "96",
  },
  {
    key: "firstContentfulPaint",
    label: "First Contentful Paint",
    suffix: "sec",
    placeholder: "1.78",
  },
  {
    key: "largestContentfulPaint",
    label: "Largest Contentful Paint",
    suffix: "sec",
    placeholder: "2.73",
  },
  {
    key: "interactionToNextPaint",
    label: "Interaction to Next Paint",
    suffix: "ms",
    placeholder: "40",
  },
  {
    key: "cumulativeLayoutShift",
    label: "Cumulative Layout Shift",
    suffix: "",
    placeholder: "0.01",
  },
  {
    key: "firstInputDelay",
    label: "First Input Delay",
    suffix: "ms",
    placeholder: "4",
  },
  {
    key: "timeToFirstByte",
    label: "Time to First Byte",
    suffix: "sec",
    placeholder: "0.09",
  },
];

// ─── Section accordion ────────────────────────────────────────────────────────

function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 bg-slate-700 rounded-lg text-sm font-semibold text-white hover:bg-slate-600 transition"
    >
      <span>{title}</span>
      <span className="text-slate-400">{open ? "▲" : "▼"}</span>
    </button>
  );
}

function SeoResultPanel({
  seoResult,
}: {
  seoResult: ReturnType<typeof useMarketingCms>["seoResult"];
}) {
  if (!seoResult) return null;

  return (
    <div className="mt-4 space-y-3">
      {seoResult.findings?.length ? (
        <SeoFindings
          findings={seoResult.findings}
          technical={seoResult.technical}
          variant="superadmin"
        />
      ) : (
        <>
          {seoResult.issues.length > 0 && (
            <div>
              <p className="text-xs font-bold text-red-400 mb-1">Problemi</p>
              <ul className="space-y-1">
                {seoResult.issues.map((issue, i) => (
                  <li key={i} className="text-xs text-slate-300 flex gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {seoResult.suggestions.length > 0 && (
            <div>
              <p className="text-xs font-bold text-amber-400 mb-1">Preporuke</p>
              <ul className="space-y-1">
                {seoResult.suggestions.map((s, i) => (
                  <li key={i} className="text-xs text-slate-300 flex gap-2">
                    <span className="text-amber-400 mt-0.5">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {seoResult.keywords.length > 0 && (
        <div>
          <p className="text-xs font-bold text-emerald-400 mb-2">Keywords</p>
          <div className="flex flex-wrap gap-1">
            {seoResult.keywords.map((kw, i) => (
              <span
                key={i}
                className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Typo-fix result panel ────────────────────────────────────────────────────

function TypoFixPanel({ result }: { result: TypoFixState | null }) {
  if (!result) return null;

  if (result.status === "error") {
    return (
      <div className={`${card} border border-red-800/60`}>
        <p className="text-[11px] font-bold text-red-400 uppercase tracking-wide mb-1">
          Typo provera
        </p>
        <p className="text-sm text-red-300">
          Nije ništa ispravljeno zbog sistemske greške — pokušaj ponovo.
        </p>
      </div>
    );
  }

  if (result.status === "clean") {
    return (
      <div className={`${card} border border-emerald-800/50`}>
        <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide mb-1">
          Typo provera
        </p>
        <p className="text-sm text-emerald-300">
          ✓ Sve je čisto — nije pronađena nijedna typo greška.
        </p>
      </div>
    );
  }

  return (
    <div className={card}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
          Ispravljene typo greške
          <span className="ml-2 text-violet-400">
            {result.corrections.length}
          </span>
        </p>
        <span className="text-[10px] text-slate-500">
          Proveri i sačuvaj da primeniš
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {result.corrections.map((c, i) => (
          <span
            key={`${c.before}-${c.after}-${i}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-700/60 px-2 py-1 text-xs"
          >
            {c.before && (
              <span className="text-slate-400 line-through">{c.before}</span>
            )}
            {c.before && <span className="text-slate-500">→</span>}
            <span className="font-semibold text-emerald-300">{c.after}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Pages modal ──────────────────────────────────────────────────────────────

function PageModal({
  page,
  onClose,
  onSave,
  isSaving,
}: {
  page: CmsPage | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    slug?: string;
    content: string;
  }) => Promise<void>;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState(page?.title ?? "");
  const [content, setContent] = useState(page?.content ?? "");

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h3 className="font-bold text-white">
            {page ? "Uredi stranicu" : "Nova stranica"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!page && (
            <div>
              <label className={lbl}>Naziv stranice</label>
              <input
                className={inp}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="npr. Politika privatnosti"
              />
            </div>
          )}
          <div className="flex-1">
            <label className={lbl}>Sadržaj (Markdown)</label>
            <textarea
              className={`${inp} font-mono text-xs`}
              rows={20}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"# Naslov\n\n## Sekcija\n\nTekst..."}
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end px-5 py-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 text-sm hover:text-white"
          >
            Otkaži
          </button>
          <button
            className={btnPrimary}
            disabled={isSaving || (!page && !title.trim())}
            onClick={async () => {
              await onSave({ title, content, slug: page?.slug });
              onClose();
            }}
          >
            {isSaving ? "Čuvanje..." : "Sačuvaj"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main MarketingTab ────────────────────────────────────────────────────────

export function MarketingTab() {
  const {
    landing,
    isLoading,
    isSaving,
    update,
    save,
    seoResult,
    seoLoading,
    autoFixLoading,
    typoFixLoading,
    typoResult,
    runSeoAnalysis,
    runAutoFix,
    runTypoFix,
  } = useMarketingCms();

  const {
    pages,
    isLoading: pagesLoading,
    createPage,
    updatePage,
    deletePage,
    seedDefaults,
    isMutating,
  } = useCmsPages();

  const [openSection, setOpenSection] = useState<string | null>("hero");
  const [modalPage, setModalPage] = useState<CmsPage | null | "new">(
    undefined as unknown as null,
  );
  const [showPageModal, setShowPageModal] = useState(false);
  const [activePanel, setActivePanel] = useState<"landing" | "pages">(
    "landing",
  );
  const [performance, setPerformance] = useState<PerformanceSeoSnapshot>({});

  function toggle(s: string) {
    setOpenSection((prev) => (prev === s ? null : s));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        Učitavanje...
      </div>
    );
  }

  const ls = landing;

  return (
    <div className="space-y-4">
      {/* Panel tabs */}
      <div className="flex gap-2">
        {(["landing", "pages"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setActivePanel(p)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activePanel === p
                ? "bg-violet-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {p === "landing" ? "Landing sekcije" : "Stranice"}
          </button>
        ))}
      </div>

      {/* ── Landing sekcije ── */}
      {activePanel === "landing" && (
        <div className="space-y-3">
          {/* Typo-fix rezultat — iznad SEO analize */}
          <TypoFixPanel result={typoResult} />

          <div className={card}>
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xs text-slate-400 font-bold uppercase">
                      SEO Metadata i AI analiza
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Analiza koristi renderovani snapshot landing stranice,
                      metadata i CTA tok.
                    </p>
                    {seoResult?.snapshotSource && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Snapshot:{" "}
                        <span className="text-violet-300">
                          {seoResult.snapshotSource === "rendered-dom"
                            ? "renderovani DOM"
                            : "CMS fallback"}
                        </span>
                      </p>
                    )}
                  </div>
                  {seoResult && <ScoreBadge score={seoResult.score} />}
                </div>
                <div>
                  <label className={lbl}>Home Title</label>
                  <input
                    className={inp}
                    value={ls.seo.homeTitle}
                    onChange={(e) =>
                      update("seo", { ...ls.seo, homeTitle: e.target.value })
                    }
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    {ls.seo.homeTitle.length}/60
                  </p>
                </div>
                <div>
                  <label className={lbl}>Home Description</label>
                  <textarea
                    className={inp}
                    rows={3}
                    value={ls.seo.homeDescription}
                    onChange={(e) =>
                      update("seo", {
                        ...ls.seo,
                        homeDescription: e.target.value,
                      })
                    }
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    {ls.seo.homeDescription.length}/160
                  </p>
                </div>
                <div>
                  <label className={lbl}>OG image</label>
                  <SingleImageField
                    value={ls.seo.ogImage ?? ""}
                    onChange={(url) =>
                      update("seo", { ...ls.seo, ogImage: url })
                    }
                  />
                </div>
              </div>

              <div>
                <h2 className="text-xs text-slate-400 font-bold uppercase mb-3">
                  {"Performanse opcionalno (Speed Insights)"}
                </h2>
                <div className="grid sm:grid-cols-2 gap-2">
                  {PERFORMANCE_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className={lbl}>
                        {field.label}{" "}
                        {field.suffix && (
                          <span className="w-8 text-xs lowercase text-indigo-500">
                            u {field.suffix}
                          </span>
                        )}
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          className={inp}
                          type="number"
                          step="0.01"
                          placeholder={field.placeholder}
                          value={performance[field.key] ?? ""}
                          onChange={(e) =>
                            setPerformance((prev) => ({
                              ...prev,
                              [field.key]:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={btnPrimary}
                disabled={seoLoading}
                onClick={() => runSeoAnalysis(performance)}
              >
                {seoLoading ? "Analiziranje..." : "Pokreni AI SEO analizu"}
              </button>
              {seoResult && (
                <button
                  className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition disabled:opacity-40"
                  disabled={autoFixLoading}
                  onClick={() => runAutoFix(performance)}
                >
                  {autoFixLoading ? "Popravljanje..." : "✦ Auto-fix sadržaj"}
                </button>
              )}
              <button
                className="px-4 py-2 bg-sky-700 text-white text-xs font-bold rounded-lg hover:bg-sky-600 transition disabled:opacity-40"
                disabled={typoFixLoading}
                onClick={() => runTypoFix()}
                title="Ispravlja samo pravopisne/typo greške, bez SEO prepravke"
              >
                {typoFixLoading ? "Ispravljanje..." : "✓ Ispravi typo greške"}
              </button>
              <button
                className="px-4 py-2 bg-slate-700 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-600 transition disabled:opacity-40"
                disabled={isSaving}
                onClick={() => save()}
              >
                {isSaving ? "Čuvanje..." : "Sačuvaj SEO"}
              </button>
            </div>

            <SeoResultPanel seoResult={seoResult} />
          </div>

          {/* Header */}
          <div className={card}>
            <SectionHeader
              title="Header"
              open={openSection === "header"}
              onToggle={() => toggle("header")}
            />
            {openSection === "header" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className={lbl}>Logo tekst</label>
                  <input
                    className={inp}
                    value={ls.header.logoText}
                    onChange={(e) =>
                      update("header", {
                        ...ls.header,
                        logoText: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>CTA dugme tekst</label>
                  <input
                    className={inp}
                    value={ls.header.ctaText}
                    onChange={(e) =>
                      update("header", {
                        ...ls.header,
                        ctaText: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>CTA link</label>
                  <input
                    className={inp}
                    value={ls.header.ctaHref}
                    onChange={(e) =>
                      update("header", {
                        ...ls.header,
                        ctaHref: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>
                    Nav linkovi (jedan po redu: Tekst|/href)
                  </label>
                  <textarea
                    className={`${inp} font-mono text-xs`}
                    rows={3}
                    value={ls.header.navLinks
                      .map((l) => `${l.text}|${l.href}`)
                      .join("\n")}
                    onChange={(e) => {
                      const links = e.target.value
                        .split("\n")
                        .filter(Boolean)
                        .map((line) => {
                          const [text, href = "#"] = line.split("|");
                          return { text: text.trim(), href: href.trim() };
                        });
                      update("header", { ...ls.header, navLinks: links });
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Hero */}
          <div className={card}>
            <SectionHeader
              title="Hero sekcija"
              open={openSection === "hero"}
              onToggle={() => toggle("hero")}
            />
            {openSection === "hero" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className={lbl}>
                    Headline (svaki novi red = novi red u H1, 2+ red je ljubičast)
                  </label>
                  <textarea
                    className={`${inp} font-mono text-xs`}
                    rows={3}
                    value={ls.hero.headline}
                    onChange={(e) =>
                      update("hero", { ...ls.hero, headline: e.target.value })
                    }
                    placeholder={"Automatizuj\nsvoj salon"}
                  />
                </div>
                <div>
                  <label className={lbl}>Subheadline</label>
                  <textarea
                    className={inp}
                    rows={4}
                    value={ls.hero.subheadline}
                    onChange={(e) =>
                      update("hero", {
                        ...ls.hero,
                        subheadline: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>Social proof tekst</label>
                  <input
                    className={inp}
                    value={ls.hero.socialProofText}
                    onChange={(e) =>
                      update("hero", {
                        ...ls.hero,
                        socialProofText: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>Bedževi (jedan po redu)</label>
                  <textarea
                    className={`${inp} font-mono text-xs`}
                    rows={4}
                    value={ls.hero.badges.map((b) => b.text).join("\n")}
                    onChange={(e) => {
                      const badges = e.target.value
                        .split("\n")
                        .filter(Boolean)
                        .map((t) => ({ text: t.trim() }));
                      update("hero", { ...ls.hero, badges });
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>CTA primarni tekst</label>
                    <input
                      className={inp}
                      value={ls.hero.ctaPrimaryText}
                      onChange={(e) =>
                        update("hero", {
                          ...ls.hero,
                          ctaPrimaryText: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={lbl}>CTA primarni link</label>
                    <input
                      className={inp}
                      value={ls.hero.ctaPrimaryHref}
                      onChange={(e) =>
                        update("hero", {
                          ...ls.hero,
                          ctaPrimaryHref: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={lbl}>CTA sekundarni tekst</label>
                    <input
                      className={inp}
                      value={ls.hero.ctaSecondaryText}
                      onChange={(e) =>
                        update("hero", {
                          ...ls.hero,
                          ctaSecondaryText: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={lbl}>CTA sekundarni link</label>
                    <input
                      className={inp}
                      value={ls.hero.ctaSecondaryHref}
                      onChange={(e) =>
                        update("hero", {
                          ...ls.hero,
                          ctaSecondaryHref: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* About */}
          <div className={card}>
            <SectionHeader
              title="About sekcija"
              open={openSection === "about"}
              onToggle={() => toggle("about")}
            />
            {openSection === "about" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className={lbl}>H2 naslov</label>
                  <textarea
                    className={inp}
                    rows={2}
                    value={ls.about.headline}
                    onChange={(e) =>
                      update("about", {
                        ...ls.about,
                        headline: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>Lista benefita (jedan po redu)</label>
                  <textarea
                    className={`${inp} font-mono text-xs`}
                    rows={5}
                    value={ls.about.bullets.join("\n")}
                    onChange={(e) =>
                      update("about", {
                        ...ls.about,
                        bullets: e.target.value
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>Paragrafi (jedan po redu)</label>
                  <textarea
                    className={`${inp} font-mono text-xs`}
                    rows={6}
                    value={ls.about.paragraphs.join("\n")}
                    onChange={(e) =>
                      update("about", {
                        ...ls.about,
                        paragraphs: e.target.value
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className={card}>
            <SectionHeader
              title="Zašto Mary (do 6 stavki: staro vs novo)"
              open={openSection === "how"}
              onToggle={() => toggle("how")}
            />
            {openSection === "how" && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className={lbl}>Naslov sekcije</label>
                  <input
                    className={inp}
                    value={ls.howItWorks.headline}
                    onChange={(e) =>
                      update("howItWorks", {
                        ...ls.howItWorks,
                        headline: e.target.value,
                      })
                    }
                  />
                </div>
                {ls.howItWorks.items.map((item, i) => (
                  <div
                    key={i}
                    className="bg-slate-700/40 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400 font-bold uppercase">
                        Stavka {i + 1}
                      </p>
                      {ls.howItWorks.items.length > 1 && (
                        <button
                          className="text-xs text-red-400 hover:text-red-300 transition"
                          onClick={() => {
                            const items = ls.howItWorks.items.filter((_, idx) => idx !== i);
                            update("howItWorks", { ...ls.howItWorks, items });
                          }}
                        >
                          Obriši
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={lbl}>Staro (✕)</label>
                        <input
                          className={inp}
                          value={item.oldTitle}
                          onChange={(e) => {
                            const items = [...ls.howItWorks.items];
                            items[i] = {
                              ...items[i],
                              oldTitle: e.target.value,
                            };
                            update("howItWorks", { ...ls.howItWorks, items });
                          }}
                        />
                      </div>
                      <div>
                        <label className={lbl}>Novo (✓)</label>
                        <input
                          className={inp}
                          value={item.newTitle}
                          onChange={(e) => {
                            const items = [...ls.howItWorks.items];
                            items[i] = {
                              ...items[i],
                              newTitle: e.target.value,
                            };
                            update("howItWorks", { ...ls.howItWorks, items });
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>Opis</label>
                      <input
                        className={inp}
                        value={item.description}
                        onChange={(e) => {
                          const items = [...ls.howItWorks.items];
                          items[i] = {
                            ...items[i],
                            description: e.target.value,
                          };
                          update("howItWorks", { ...ls.howItWorks, items });
                        }}
                      />
                    </div>
                  </div>
                ))}
                {ls.howItWorks.items.length < 6 && (
                  <button
                    className="w-full py-2 border border-dashed border-slate-600 text-slate-400 text-xs font-bold rounded-lg hover:border-violet-500 hover:text-violet-400 transition"
                    onClick={() => {
                      const items = [
                        ...ls.howItWorks.items,
                        { oldTitle: "", newTitle: "", description: "" },
                      ];
                      update("howItWorks", { ...ls.howItWorks, items });
                    }}
                  >
                    + Dodaj stavku ({ls.howItWorks.items.length}/6)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Features */}
          <div className={card}>
            <SectionHeader
              title="Feature kartice (3 kartice)"
              open={openSection === "features"}
              onToggle={() => toggle("features")}
            />
            {openSection === "features" && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className={lbl}>Naslov sekcije</label>
                  <input
                    className={inp}
                    value={ls.features.headline}
                    onChange={(e) =>
                      update("features", {
                        ...ls.features,
                        headline: e.target.value,
                      })
                    }
                  />
                </div>
                {ls.features.cards.map((card2, i) => (
                  <div
                    key={i}
                    className="bg-slate-700/40 rounded-lg p-3 space-y-2"
                  >
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Kartica {i + 1}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className={lbl}>Ikona</label>
                        <input
                          className={inp}
                          value={card2.icon}
                          onChange={(e) => {
                            const cards = [...ls.features.cards];
                            cards[i] = { ...cards[i], icon: e.target.value };
                            update("features", { ...ls.features, cards });
                          }}
                        />
                      </div>
                      <div>
                        <label className={lbl}>Problem</label>
                        <input
                          className={inp}
                          value={card2.problem}
                          onChange={(e) => {
                            const cards = [...ls.features.cards];
                            cards[i] = { ...cards[i], problem: e.target.value };
                            update("features", { ...ls.features, cards });
                          }}
                        />
                      </div>
                      <div>
                        <label className={lbl}>Rešenje</label>
                        <input
                          className={inp}
                          value={card2.solution}
                          onChange={(e) => {
                            const cards = [...ls.features.cards];
                            cards[i] = {
                              ...cards[i],
                              solution: e.target.value,
                            };
                            update("features", { ...ls.features, cards });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className={card}>
            <SectionHeader
              title="Cene (3 plana)"
              open={openSection === "pricing"}
              onToggle={() => toggle("pricing")}
            />
            {openSection === "pricing" && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className={lbl}>Naslov sekcije</label>
                  <input
                    className={inp}
                    value={ls.pricing.headline}
                    onChange={(e) =>
                      update("pricing", {
                        ...ls.pricing,
                        headline: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>Paragraf ispod naslova</label>
                  <textarea
                    className={inp}
                    rows={2}
                    value={ls.pricing.paragraph}
                    onChange={(e) =>
                      update("pricing", {
                        ...ls.pricing,
                        paragraph: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>H3 naslov za planove</label>
                  <input
                    className={inp}
                    value={ls.pricing.plansTitle}
                    onChange={(e) =>
                      update("pricing", {
                        ...ls.pricing,
                        plansTitle: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>
                    Objašnjenje Maria, Claudia i Kiki plana
                  </label>
                  <textarea
                    className={inp}
                    rows={3}
                    value={ls.pricing.plansDescription}
                    onChange={(e) =>
                      update("pricing", {
                        ...ls.pricing,
                        plansDescription: e.target.value,
                      })
                    }
                  />
                </div>
                {ls.pricing.plans.map((plan, i) => (
                  <div
                    key={i}
                    className="bg-slate-700/40 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400 font-bold uppercase">
                        Plan {i + 1}
                      </p>
                      {plan.popular && (
                        <span className="text-[10px] bg-violet-600 text-white px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={lbl}>Naziv</label>
                        <input
                          className={inp}
                          value={plan.name}
                          onChange={(e) => {
                            const plans = [...ls.pricing.plans];
                            plans[i] = { ...plans[i], name: e.target.value };
                            update("pricing", { ...ls.pricing, plans });
                          }}
                        />
                      </div>
                      <div>
                        <label className={lbl}>Cena (samo broj)</label>
                        <input
                          className={inp}
                          value={plan.price}
                          onChange={(e) => {
                            const plans = [...ls.pricing.plans];
                            plans[i] = { ...plans[i], price: e.target.value };
                            update("pricing", { ...ls.pricing, plans });
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>Opis</label>
                      <input
                        className={inp}
                        value={plan.description}
                        onChange={(e) => {
                          const plans = [...ls.pricing.plans];
                          plans[i] = {
                            ...plans[i],
                            description: e.target.value,
                          };
                          update("pricing", { ...ls.pricing, plans });
                        }}
                      />
                    </div>
                    <div>
                      <label className={lbl}>Features (jedan po redu)</label>
                      <textarea
                        className={`${inp} font-mono text-xs`}
                        rows={4}
                        value={plan.features.join("\n")}
                        onChange={(e) => {
                          const plans = [...ls.pricing.plans];
                          plans[i] = {
                            ...plans[i],
                            features: e.target.value
                              .split("\n")
                              .filter(Boolean),
                          };
                          update("pricing", { ...ls.pricing, plans });
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={lbl}>CTA tekst</label>
                        <input
                          className={inp}
                          value={plan.ctaText}
                          onChange={(e) => {
                            const plans = [...ls.pricing.plans];
                            plans[i] = {
                              ...plans[i],
                              ctaText: e.target.value,
                            };
                            update("pricing", { ...ls.pricing, plans });
                          }}
                        />
                      </div>
                      <div>
                        <label className={lbl}>CTA link</label>
                        <input
                          className={inp}
                          value={plan.ctaHref}
                          onChange={(e) => {
                            const plans = [...ls.pricing.plans];
                            plans[i] = {
                              ...plans[i],
                              ctaHref: e.target.value,
                            };
                            update("pricing", { ...ls.pricing, plans });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={card}>
            <SectionHeader
              title="Footer"
              open={openSection === "footer"}
              onToggle={() => toggle("footer")}
            />
            {openSection === "footer" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className={lbl}>Tagline</label>
                  <input
                    className={inp}
                    value={ls.footer.tagline}
                    onChange={(e) =>
                      update("footer", {
                        ...ls.footer,
                        tagline: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>
                    Linkovi (jedan po redu: Tekst|/href)
                  </label>
                  <textarea
                    className={`${inp} font-mono text-xs`}
                    rows={4}
                    value={ls.footer.links
                      .map((l) => `${l.text}|${l.href}`)
                      .join("\n")}
                    onChange={(e) => {
                      const links = e.target.value
                        .split("\n")
                        .filter(Boolean)
                        .map((line) => {
                          const [text, href = "#"] = line.split("|");
                          return { text: text.trim(), href: href.trim() };
                        });
                      update("footer", { ...ls.footer, links });
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ════════ DEO 2 (Secondary Content) ════════ */}

          {/* DEO 2 — Hero */}
          <div className={card}>
            <SectionHeader
              title="DEO 2 — Hero"
              open={openSection === "sec-hero"}
              onToggle={() => toggle("sec-hero")}
            />
            {openSection === "sec-hero" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className={lbl}>Eyebrow (mali tekst iznad naslova)</label>
                  <input
                    className={inp}
                    value={ls.secondary.hero.eyebrow}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        hero: { ...ls.secondary.hero, eyebrow: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>H2 naslov</label>
                  <input
                    className={inp}
                    value={ls.secondary.hero.headline}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        hero: { ...ls.secondary.hero, headline: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>Paragraf</label>
                  <textarea
                    className={inp}
                    rows={3}
                    value={ls.secondary.hero.paragraph}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        hero: { ...ls.secondary.hero, paragraph: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={lbl}>CTA primarni tekst</label>
                    <input
                      className={inp}
                      value={ls.secondary.hero.ctaPrimaryText}
                      onChange={(e) =>
                        update("secondary", {
                          ...ls.secondary,
                          hero: {
                            ...ls.secondary.hero,
                            ctaPrimaryText: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={lbl}>CTA primarni link</label>
                    <input
                      className={inp}
                      value={ls.secondary.hero.ctaPrimaryHref}
                      onChange={(e) =>
                        update("secondary", {
                          ...ls.secondary,
                          hero: {
                            ...ls.secondary.hero,
                            ctaPrimaryHref: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={lbl}>CTA sekundarni tekst</label>
                    <input
                      className={inp}
                      value={ls.secondary.hero.ctaSecondaryText}
                      onChange={(e) =>
                        update("secondary", {
                          ...ls.secondary,
                          hero: {
                            ...ls.secondary.hero,
                            ctaSecondaryText: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={lbl}>CTA sekundarni link</label>
                    <input
                      className={inp}
                      value={ls.secondary.hero.ctaSecondaryHref}
                      onChange={(e) =>
                        update("secondary", {
                          ...ls.secondary,
                          hero: {
                            ...ls.secondary.hero,
                            ctaSecondaryHref: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DEO 2 — Chips navigacija */}
          <div className={card}>
            <SectionHeader
              title="DEO 2 — Chips navigacija"
              open={openSection === "sec-chips"}
              onToggle={() => toggle("sec-chips")}
            />
            {openSection === "sec-chips" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className={lbl}>
                    Chips (jedan po redu: Tekst|#anchor)
                  </label>
                  <textarea
                    className={`${inp} font-mono text-xs`}
                    rows={9}
                    value={ls.secondary.chips
                      .map((c) => `${c.text}|${c.href}`)
                      .join("\n")}
                    onChange={(e) => {
                      const chips = e.target.value
                        .split("\n")
                        .filter(Boolean)
                        .map((line) => {
                          const [text, href = "#"] = line.split("|");
                          return { text: text.trim(), href: href.trim() };
                        });
                      update("secondary", { ...ls.secondary, chips });
                    }}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Anchori: #online-zakazivanje, #sveska-ili-kalendar,
                    #gledam-aplikaciju, #otkazivanja, #automatizacija, #faq
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* DEO 2 — Sekcija 1: Online zakazivanje */}
          <div className={card}>
            <SectionHeader
              title="DEO 2 — Online zakazivanje (Sekcija 1)"
              open={openSection === "sec-objections"}
              onToggle={() => toggle("sec-objections")}
            />
            {openSection === "sec-objections" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className={lbl}>Naslov</label>
                  <input
                    className={inp}
                    value={ls.secondary.objections.headline}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        objections: {
                          ...ls.secondary.objections,
                          headline: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>Uvodni tekst (lead)</label>
                  <input
                    className={inp}
                    value={ls.secondary.objections.lead}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        objections: {
                          ...ls.secondary.objections,
                          lead: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>
                    Baloni / citati (jedan po redu, animirani)
                  </label>
                  <textarea
                    className={`${inp} font-mono text-xs`}
                    rows={3}
                    value={ls.secondary.objections.bubbles.join("\n")}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        objections: {
                          ...ls.secondary.objections,
                          bubbles: e.target.value
                            .split("\n")
                            .map((l) => l.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>Paragrafi (jedan po redu)</label>
                  <textarea
                    className={`${inp} font-mono text-xs`}
                    rows={4}
                    value={ls.secondary.objections.paragraphs.join("\n")}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        objections: {
                          ...ls.secondary.objections,
                          paragraphs: e.target.value
                            .split("\n")
                            .map((l) => l.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* DEO 2 — Sekcija 2: Sveska vs kalendar */}
          <div className={card}>
            <SectionHeader
              title="DEO 2 — Sveska vs kalendar (Sekcija 2)"
              open={openSection === "sec-notebook"}
              onToggle={() => toggle("sec-notebook")}
            />
            {openSection === "sec-notebook" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className={lbl}>Naslov</label>
                  <input
                    className={inp}
                    value={ls.secondary.notebook.headline}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        notebook: {
                          ...ls.secondary.notebook,
                          headline: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>Lista (jedan po redu)</label>
                  <textarea
                    className={`${inp} font-mono text-xs`}
                    rows={4}
                    value={ls.secondary.notebook.items.join("\n")}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        notebook: {
                          ...ls.secondary.notebook,
                          items: e.target.value
                            .split("\n")
                            .map((l) => l.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* DEO 2 — Sekcija 3: Teme aplikacije */}
          <div className={card}>
            <SectionHeader
              title="DEO 2 — Teme aplikacije (Sekcija 3)"
              open={openSection === "sec-app"}
              onToggle={() => toggle("sec-app")}
            />
            {openSection === "sec-app" && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className={lbl}>Naslov</label>
                  <input
                    className={inp}
                    value={ls.secondary.app.headline}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        app: { ...ls.secondary.app, headline: e.target.value },
                      })
                    }
                  />
                </div>
                {ls.secondary.app.topics.map((topic, i) => (
                  <div
                    key={i}
                    className="bg-slate-700/40 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400 font-bold uppercase">
                        Tema {i + 1}
                      </p>
                      {ls.secondary.app.topics.length > 1 && (
                        <button
                          className="text-xs text-red-400 hover:text-red-300 transition"
                          onClick={() => {
                            const topics = ls.secondary.app.topics.filter(
                              (_, idx) => idx !== i,
                            );
                            update("secondary", {
                              ...ls.secondary,
                              app: { ...ls.secondary.app, topics },
                            });
                          }}
                        >
                          Obriši
                        </button>
                      )}
                    </div>
                    <div>
                      <label className={lbl}>H3 naslov</label>
                      <input
                        className={inp}
                        value={topic.title}
                        onChange={(e) => {
                          const topics = [...ls.secondary.app.topics];
                          topics[i] = { ...topics[i], title: e.target.value };
                          update("secondary", {
                            ...ls.secondary,
                            app: { ...ls.secondary.app, topics },
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className={lbl}>Objašnjenje</label>
                      <textarea
                        className={inp}
                        rows={2}
                        value={topic.description}
                        onChange={(e) => {
                          const topics = [...ls.secondary.app.topics];
                          topics[i] = {
                            ...topics[i],
                            description: e.target.value,
                          };
                          update("secondary", {
                            ...ls.secondary,
                            app: { ...ls.secondary.app, topics },
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}
                <button
                  className="w-full py-2 border border-dashed border-slate-600 text-slate-400 text-xs font-bold rounded-lg hover:border-violet-500 hover:text-violet-400 transition"
                  onClick={() => {
                    const topics = [
                      ...ls.secondary.app.topics,
                      { title: "", description: "" },
                    ];
                    update("secondary", {
                      ...ls.secondary,
                      app: { ...ls.secondary.app, topics },
                    });
                  }}
                >
                  + Dodaj temu
                </button>
              </div>
            )}
          </div>

          {/* DEO 2 — Sekcija 4: Otkazivanja */}
          <div className={card}>
            <SectionHeader
              title="DEO 2 — Otkazivanja (Sekcija 4)"
              open={openSection === "sec-cancellations"}
              onToggle={() => toggle("sec-cancellations")}
            />
            {openSection === "sec-cancellations" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className={lbl}>Naslov</label>
                  <input
                    className={inp}
                    value={ls.secondary.cancellations.headline}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        cancellations: {
                          ...ls.secondary.cancellations,
                          headline: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>
                    Paragrafi (jedan po redu, naizmenično ljubičasto/sivo)
                  </label>
                  <textarea
                    className={`${inp} font-mono text-xs`}
                    rows={5}
                    value={ls.secondary.cancellations.paragraphs.join("\n")}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        cancellations: {
                          ...ls.secondary.cancellations,
                          paragraphs: e.target.value
                            .split("\n")
                            .map((l) => l.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* DEO 2 — Sekcija 5: Automatizacija */}
          <div className={card}>
            <SectionHeader
              title="DEO 2 — Automatizacija (Sekcija 5)"
              open={openSection === "sec-automation"}
              onToggle={() => toggle("sec-automation")}
            />
            {openSection === "sec-automation" && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className={lbl}>Naslov</label>
                  <input
                    className={inp}
                    value={ls.secondary.automation.headline}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        automation: {
                          ...ls.secondary.automation,
                          headline: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                {ls.secondary.automation.items.map((item, i) => (
                  <div
                    key={i}
                    className="bg-slate-700/40 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400 font-bold uppercase">
                        Stavka {i + 1}
                      </p>
                      {ls.secondary.automation.items.length > 1 && (
                        <button
                          className="text-xs text-red-400 hover:text-red-300 transition"
                          onClick={() => {
                            const items = ls.secondary.automation.items.filter(
                              (_, idx) => idx !== i,
                            );
                            update("secondary", {
                              ...ls.secondary,
                              automation: { ...ls.secondary.automation, items },
                            });
                          }}
                        >
                          Obriši
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className={lbl}>Ikona</label>
                        <input
                          className={inp}
                          value={item.icon}
                          onChange={(e) => {
                            const items = [...ls.secondary.automation.items];
                            items[i] = { ...items[i], icon: e.target.value };
                            update("secondary", {
                              ...ls.secondary,
                              automation: { ...ls.secondary.automation, items },
                            });
                          }}
                        />
                      </div>
                      <div className="col-span-3">
                        <label className={lbl}>Naslov</label>
                        <input
                          className={inp}
                          value={item.title}
                          onChange={(e) => {
                            const items = [...ls.secondary.automation.items];
                            items[i] = { ...items[i], title: e.target.value };
                            update("secondary", {
                              ...ls.secondary,
                              automation: { ...ls.secondary.automation, items },
                            });
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>Opis</label>
                      <textarea
                        className={inp}
                        rows={2}
                        value={item.description}
                        onChange={(e) => {
                          const items = [...ls.secondary.automation.items];
                          items[i] = {
                            ...items[i],
                            description: e.target.value,
                          };
                          update("secondary", {
                            ...ls.secondary,
                            automation: { ...ls.secondary.automation, items },
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}
                <button
                  className="w-full py-2 border border-dashed border-slate-600 text-slate-400 text-xs font-bold rounded-lg hover:border-violet-500 hover:text-violet-400 transition"
                  onClick={() => {
                    const items = [
                      ...ls.secondary.automation.items,
                      { icon: "", title: "", description: "" },
                    ];
                    update("secondary", {
                      ...ls.secondary,
                      automation: { ...ls.secondary.automation, items },
                    });
                  }}
                >
                  + Dodaj stavku
                </button>

                <div className="bg-slate-700/40 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-slate-400 font-bold uppercase">
                    Google primer
                  </p>
                  <div>
                    <label className={lbl}>Pitanje</label>
                    <input
                      className={inp}
                      value={ls.secondary.automation.assistantExample.question}
                      onChange={(e) =>
                        update("secondary", {
                          ...ls.secondary,
                          automation: {
                            ...ls.secondary.automation,
                            assistantExample: {
                              ...ls.secondary.automation.assistantExample,
                              question: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={lbl}>Naslov odgovora</label>
                    <input
                      className={inp}
                      value={ls.secondary.automation.assistantExample.replyTitle}
                      onChange={(e) =>
                        update("secondary", {
                          ...ls.secondary,
                          automation: {
                            ...ls.secondary.automation,
                            assistantExample: {
                              ...ls.secondary.automation.assistantExample,
                              replyTitle: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={lbl}>Stavke rasporeda (jedna po redu)</label>
                    <textarea
                      className={`${inp} font-mono text-xs`}
                      rows={3}
                      value={ls.secondary.automation.assistantExample.lines.join(
                        "\n",
                      )}
                      onChange={(e) =>
                        update("secondary", {
                          ...ls.secondary,
                          automation: {
                            ...ls.secondary.automation,
                            assistantExample: {
                              ...ls.secondary.automation.assistantExample,
                              lines: e.target.value
                                .split("\n")
                                .map((l) => l.trim())
                                .filter(Boolean),
                            },
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DEO 2 — FAQ */}
          <div className={card}>
            <SectionHeader
              title="DEO 2 — FAQ (do 8 pitanja)"
              open={openSection === "sec-faq"}
              onToggle={() => toggle("sec-faq")}
            />
            {openSection === "sec-faq" && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className={lbl}>H2 naslov</label>
                  <input
                    className={inp}
                    value={ls.secondary.faq.headline}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        faq: { ...ls.secondary.faq, headline: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>Paragraf ispod naslova</label>
                  <textarea
                    className={inp}
                    rows={2}
                    value={ls.secondary.faq.paragraph}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        faq: { ...ls.secondary.faq, paragraph: e.target.value },
                      })
                    }
                  />
                </div>
                {ls.secondary.faq.items.map((item, i) => (
                  <div
                    key={i}
                    className="bg-slate-700/40 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400 font-bold uppercase">
                        Pitanje {i + 1}
                      </p>
                      <button
                        className="text-xs text-red-400 hover:text-red-300 transition"
                        onClick={() => {
                          const items = ls.secondary.faq.items.filter(
                            (_, idx) => idx !== i,
                          );
                          update("secondary", {
                            ...ls.secondary,
                            faq: { ...ls.secondary.faq, items },
                          });
                        }}
                      >
                        Obriši
                      </button>
                    </div>
                    <div>
                      <label className={lbl}>Pitanje (H3)</label>
                      <input
                        className={inp}
                        value={item.question}
                        onChange={(e) => {
                          const items = [...ls.secondary.faq.items];
                          items[i] = { ...items[i], question: e.target.value };
                          update("secondary", {
                            ...ls.secondary,
                            faq: { ...ls.secondary.faq, items },
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className={lbl}>
                        Odgovor (prazno = kratak fallback)
                      </label>
                      <textarea
                        className={inp}
                        rows={3}
                        value={item.answer}
                        onChange={(e) => {
                          const items = [...ls.secondary.faq.items];
                          items[i] = { ...items[i], answer: e.target.value };
                          update("secondary", {
                            ...ls.secondary,
                            faq: { ...ls.secondary.faq, items },
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}
                {ls.secondary.faq.items.length < 8 && (
                  <button
                    className="w-full py-2 border border-dashed border-slate-600 text-slate-400 text-xs font-bold rounded-lg hover:border-violet-500 hover:text-violet-400 transition"
                    onClick={() => {
                      const items = [
                        ...ls.secondary.faq.items,
                        { question: "", answer: "" },
                      ];
                      update("secondary", {
                        ...ls.secondary,
                        faq: { ...ls.secondary.faq, items },
                      });
                    }}
                  >
                    + Dodaj pitanje ({ls.secondary.faq.items.length}/8)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* DEO 2 — Galerija */}
          <div className={card}>
            <SectionHeader
              title="DEO 2 — Galerija"
              open={openSection === "sec-gallery"}
              onToggle={() => toggle("sec-gallery")}
            />
            {openSection === "sec-gallery" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className={lbl}>Naslov</label>
                  <input
                    className={inp}
                    value={ls.secondary.gallery.headline}
                    onChange={(e) =>
                      update("secondary", {
                        ...ls.secondary,
                        gallery: {
                          ...ls.secondary.gallery,
                          headline: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={lbl}>Slika</label>
                  <SingleImageField
                    value={ls.secondary.gallery.image}
                    onChange={(url) =>
                      update("secondary", {
                        ...ls.secondary,
                        gallery: { ...ls.secondary.gallery, image: url },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Save */}
          <button
            className={`${btnPrimary} w-full py-3`}
            disabled={isSaving}
            onClick={() => save()}
          >
            {isSaving ? "Čuvanje..." : "Sačuvaj landing"}
          </button>
        </div>
      )}

      {/* ── Stranice ── */}
      {activePanel === "pages" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Markdown stranice (Terms, Privacy, Refund Policy...)
            </p>
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-600 transition"
                onClick={seedDefaults}
              >
                Seed defaults
              </button>
              <button
                className={btnPrimary}
                onClick={() => {
                  setModalPage(null);
                  setShowPageModal(true);
                }}
              >
                + Dodaj stranicu
              </button>
            </div>
          </div>

          {pagesLoading ? (
            <p className="text-slate-400 text-sm">Učitavanje...</p>
          ) : pages.length === 0 ? (
            <div className={`${card} text-center py-8`}>
              <p className="text-slate-400 text-sm mb-3">Nema stranica.</p>
              <p className="text-slate-500 text-xs">
                Klikni &quot;Seed defaults&quot; za Privacy, Terms i Refund
                Policy.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pages.map((p) => (
                <div
                  key={p.slug}
                  className={`${card} flex items-center justify-between`}
                >
                  <div>
                    <p className="font-semibold text-white text-sm">
                      {p.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      /{p.slug} ·{" "}
                      {p.updatedAt
                        ? new Date(p.updatedAt).toLocaleDateString("sr-Latn")
                        : "—"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-600"
                      onClick={() => {
                        setModalPage(p);
                        setShowPageModal(true);
                      }}
                    >
                      Uredi
                    </button>
                    <button
                      className={btnDanger}
                      onClick={() => {
                        if (confirm(`Obriši stranicu "${p.title}"?`)) {
                          deletePage(p.slug);
                        }
                      }}
                    >
                      Obriši
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Page modal */}
      {showPageModal && (
        <PageModal
          page={modalPage as CmsPage | null}
          onClose={() => setShowPageModal(false)}
          isSaving={isMutating}
          onSave={async (data) => {
            if (
              modalPage &&
              typeof modalPage === "object" &&
              "slug" in modalPage
            ) {
              await updatePage({
                slug: modalPage.slug,
                title: data.title,
                content: data.content,
              });
            } else {
              await createPage(data);
            }
          }}
        />
      )}
    </div>
  );
}
