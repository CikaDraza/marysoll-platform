"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSalonProfileAdmin } from "@/hooks/useSalonProfileAdmin";
import type { LandingStructure, LandingTheme } from "@/types";
import { ImageSelect } from "@/components/elements/ImageSelect";
import toast from "react-hot-toast";
import LoaderButton from "@/components/elements/LoaderButton";
import Image from "next/image";
import { THEME_CONFIG } from "@/lib/themeConfig";

// ─── Style tokens (match dashboard) ──────────────────────────────────────────

const inp = [
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm",
  "text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800",
  "focus:outline-none focus:ring-2 focus:ring-violet-400 transition",
  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
].join(" ");

const lbl =
  "block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5";

const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

// ─── Heroicons name list for appointment instructions ─────────────────────────

const HEROICON_OPTIONS = [
  "CalendarDaysIcon",
  "CursorArrowRaysIcon",
  "BuildingOffice2Icon",
  "DevicePhoneMobileIcon",
  "ClockIcon",
  "StarIcon",
  "CheckCircleIcon",
  "SparklesIcon",
  "HeartIcon",
  "HandThumbUpIcon",
  "ChatBubbleLeftRightIcon",
  "PhoneIcon",
  "EnvelopeIcon",
  "MapPinIcon",
  "UserIcon",
  "UsersIcon",
  "ScissorsIcon",
  "BeakerIcon",
  "CameraIcon",
  "GiftIcon",
  "TagIcon",
  "TrophyIcon",
  "BoltIcon",
  "FireIcon",
  "FaceSmileIcon",
];

// ─── SEO types ────────────────────────────────────────────────────────────────

export interface SeoAnalysisResult {
  score: number;
  issues: string[];
  suggestions: string[];
  keywords: string[];
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
        checked ? "bg-violet-600" : "bg-gray-200 dark:bg-gray-700"
      }`}
    >
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({
  title,
  badge,
  enabled,
  onToggle,
  children,
  readonly,
}: {
  title: string;
  badge?: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
  readonly?: boolean;
}) {
  return (
    <div className={card}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
          {badge && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
              {badge}
            </span>
          )}
          {readonly && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              read-only
            </span>
          )}
        </div>
        <ToggleSwitch
          checked={enabled}
          onChange={onToggle}
          label={`Toggle ${title}`}
        />
      </div>
      {enabled && <div className="space-y-4">{children}</div>}
      {!enabled && (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
          Sekcija je isključena — neće se prikazati na landing stranici.
        </p>
      )}
    </div>
  );
}

// ─── SEO Score Badge ──────────────────────────────────────────────────────────

function SeoBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
      : score >= 50
        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold ${color}`}
    >
      SEO Score: {score}/100
    </span>
  );
}

// ─── Image input with gallery picker + AI generation + upload ─────────────────

function ImageInputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch("/api/cloudinary/images", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new Error("Upload failed");
    const { secure_url } = await res.json();
    return secure_url;
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
      toast.success("Slika uploadovana!");
    } catch {
      toast.error("Greška pri uploadu slike");
    } finally {
      setUploading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Unesite prompt za sliku");
      return;
    }
    setGenerating(true);
    try {
      // 1. Generate via AI → base64
      const genRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (!genRes.ok) throw new Error("Generisanje slike nije uspelo");
      const { image: dataUrl } = await genRes.json();

      // 2. Convert base64 to File and upload to Cloudinary
      const base64 = dataUrl.split(",")[1];
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const file = new File([bytes], `ai-gallery-${Date.now()}.png`, {
        type: "image/png",
      });
      const url = await uploadToCloudinary(file);
      onChange(url);
      setShowAi(false);
      setAiPrompt("");
      toast.success("AI slika generisana i uploadovana!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Greška pri generisanju");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className={lbl}>{label}</label>
      <div className="flex gap-2">
        <input
          className={inp}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... ili izaberite ispod"
        />
        <button
          type="button"
          onClick={() => {
            setShowPicker((p) => !p);
            setShowAi(false);
          }}
          className="cursor-pointer shrink-0 px-3 py-2 text-xs font-semibold rounded-xl border border-violet-300 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 dark:border-violet-700 dark:text-violet-400 transition"
        >
          Galerija
        </button>
        <button
          type="button"
          onClick={() => {
            setShowAi((p) => !p);
            setShowPicker(false);
          }}
          className="cursor-pointer shrink-0 px-3 py-2 text-xs font-semibold rounded-xl border border-pink-300 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/20 dark:border-pink-700 dark:text-pink-400 transition"
        >
          AI
        </button>
        <label className="shrink-0 px-3 py-2.5 text-xs font-semibold rounded-xl border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer flex items-center">
          {uploading ? <LoaderButton /> : "Upload"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {showAi && (
        <div className="flex gap-2 p-3 rounded-xl bg-pink-50 dark:bg-pink-900/10 border border-pink-200 dark:border-pink-800">
          <input
            className={inp + " flex-1"}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Opiši sliku za AI generisanje..."
            onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
          />
          <button
            type="button"
            disabled={generating}
            onClick={handleAiGenerate}
            className="shrink-0 px-3 py-2 text-xs font-semibold rounded-xl bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50 transition flex items-center gap-1.5"
          >
            {generating ? (
              <>
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />{" "}
                Generiše...
              </>
            ) : (
              "Generiši"
            )}
          </button>
        </div>
      )}

      {showPicker && (
        <ImageSelect
          value={value}
          onChange={(url) => {
            onChange(url);
            setShowPicker(false);
          }}
        />
      )}
      {value && (
        <Image
          width={100}
          height={100}
          src={value}
          alt="preview"
          className="mt-2 h-24 w-auto rounded-xl object-cover border border-gray-200 dark:border-gray-700"
        />
      )}
    </div>
  );
}

// ─── Main CMS Component ───────────────────────────────────────────────────────

interface Props {
  sp: ReturnType<typeof useSalonProfileAdmin>;
}

export function AdminLandingCMS({ sp }: Props) {
  const { token } = useAuth();
  const ls = sp.form.landingStructure;
  const themeConf = THEME_CONFIG[(sp.form.landingTheme as LandingTheme) ?? "theme-1"];

  const [seoResult, setSeoResult] = useState<SeoAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);

  // ── Deep update helpers ──────────────────────────────────────────────────

  const updateLS = useCallback(
    (next: LandingStructure) => sp.setLandingStructure(next),
    [sp],
  );

  const updateLandingSection = useCallback(
    <K extends keyof LandingStructure["landing"]>(
      section: K,
      value: LandingStructure["landing"][K],
    ) => {
      updateLS({
        ...ls,
        landing: { ...ls.landing, [section]: value },
      });
    },
    [ls, updateLS],
  );

  const updatePagesSection = useCallback(
    <K extends keyof LandingStructure["pages"]>(
      section: K,
      value: LandingStructure["pages"][K],
    ) => {
      updateLS({
        ...ls,
        pages: { ...ls.pages, [section]: value },
      });
    },
    [ls, updateLS],
  );

  // ── Save + SEO analysis ──────────────────────────────────────────────────

  const handleSave = () => {
    sp.save(undefined, {
      onSuccess: () => runSeoAnalysis(),
    });
  };

  const runSeoAnalysis = async () => {
    if (!token) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/landing-cms/seo-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ landingStructure: ls }),
      });
      if (!res.ok) throw new Error("SEO analiza neuspešna");
      const data = await res.json();
      setSeoResult(data);
    } catch {
      toast.error("SEO analiza nije uspela");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutoFix = async () => {
    if (!token) return;
    setIsAutoFixing(true);
    try {
      const res = await fetch("/api/landing-cms/auto-fix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          landingStructure: ls,
          seoResult,
        }),
      });
      if (!res.ok) throw new Error("Auto-fix neuspešan");
      const { landingStructure: fixed } = await res.json();
      updateLS(fixed);
      toast.success("Sadržaj poboljšan! Sačuvajte da biste primenili promene.");
    } catch {
      toast.error("Auto-fix nije uspeo");
    } finally {
      setIsAutoFixing(false);
    }
  };

  // ── Shortcuts ────────────────────────────────────────────────────────────

  const hero = ls.landing.hero;
  const about = ls.landing.about;
  const servicesPreview = ls.landing.servicesPreview;
  const appointmentSection = ls.landing.appointmentSection;
  const testimonials = ls.landing.testimonials;
  const gallery = ls.landing.gallery;
  const faq = ls.landing.faq;
  const servicesPage = ls.pages.servicesPage;
  const appointmentsPage = ls.pages.appointmentsPage;

  return (
    <div className="space-y-6">
      {/* ── Save bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white">
            Landing CMS
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Upravljajte sadržajem landing stranice po sekcijama.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAnalyzing && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin inline-block" />
              SEO analiza...
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={sp.isSaving}
            className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
          >
            {sp.isSaving ? "Snimanje..." : "Sačuvaj"}
          </button>
        </div>
      </div>

      {/* ── SEO Panel ────────────────────────────────────────────────────── */}
      {seoResult && (
        <div className={card + " space-y-4"}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-gray-900 dark:text-white">
                SEO Analiza
              </h3>
              <SeoBadge score={seoResult.score} />
            </div>
            <button
              onClick={handleAutoFix}
              disabled={isAutoFixing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50"
            >
              {isAutoFixing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                  Popravljanje...
                </>
              ) : (
                "✦ Auto-fix sadržaj"
              )}
            </button>
          </div>

          {seoResult.issues.length > 0 && (
            <div>
              <p className={lbl}>Problemi</p>
              <ul className="space-y-1.5">
                {seoResult.issues.map((issue, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
                  >
                    <span className="mt-0.5 shrink-0">✕</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {seoResult.suggestions.length > 0 && (
            <div>
              <p className={lbl}>Preporuke</p>
              <ul className="space-y-1.5">
                {seoResult.suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="mt-0.5 shrink-0 text-violet-500">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {seoResult.keywords.length > 0 && (
            <div>
              <p className={lbl}>Predloženi ključni pojmovi</p>
              <div className="flex flex-wrap gap-2">
                {seoResult.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs font-medium"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          LANDING SECTIONS
          ══════════════════════════════════════════════════════════════════ */}

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <SectionCard
        title="Landing / Hero"
        badge="Hero"
        enabled={hero.enabled}
        onToggle={(v) => updateLandingSection("hero", { ...hero, enabled: v })}
      >
        <div className="space-y-3">
          <div>
            <label className={lbl}>Naslov (Headline)</label>
            <input
              className={inp}
              value={hero.headline ?? ""}
              onChange={(e) =>
                updateLandingSection("hero", {
                  ...hero,
                  headline: e.target.value,
                })
              }
              placeholder="npr. Marysoll Beauty Salon"
            />
          </div>
          <div>
            <label className={lbl}>Podtekst (Subheadline)</label>
            <textarea
              className={inp + " resize-none"}
              rows={2}
              value={hero.subheadline ?? ""}
              onChange={(e) =>
                updateLandingSection("hero", {
                  ...hero,
                  subheadline: e.target.value,
                })
              }
              placeholder="Kratki opis ispod naslova..."
            />
          </div>
          <div>
            <label className={lbl}>
              Ko, šta, za koga (Where/What/For whom)
            </label>
            <textarea
              className={inp + " resize-none"}
              rows={2}
              value={hero.whereWhatForWhom ?? ""}
              onChange={(e) =>
                updateLandingSection("hero", {
                  ...hero,
                  whereWhatForWhom: e.target.value,
                })
              }
              placeholder="npr. Salon lepote u Beogradu za profesionalno šminkanje..."
            />
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
          <p className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 inline-block px-2.5 py-1 rounded-lg">
            Kontakt
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Lokacija</label>
              <input
                className={inp}
                value={hero.contact?.location ?? ""}
                onChange={(e) =>
                  updateLandingSection("hero", {
                    ...hero,
                    contact: { ...hero.contact, location: e.target.value },
                  })
                }
                placeholder="npr. Beograd, Srbija"
              />
            </div>
            <div>
              <label className={lbl}>Telefon</label>
              <input
                className={inp}
                value={hero.contact?.phone ?? ""}
                onChange={(e) =>
                  updateLandingSection("hero", {
                    ...hero,
                    contact: { ...hero.contact, phone: e.target.value },
                  })
                }
                placeholder="+381 60 123 4567"
              />
            </div>
          </div>
        </div>

        {/* Social links */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
          <div>
            <p className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 inline-block px-2.5 py-1 rounded-lg">
              Društvene mreže (Hero)
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              Prazno polje koristi vrednost iz kartice Social &amp; SEO.
            </p>
          </div>
          {(
            [
              { key: "instagram", placeholder: "https://instagram.com/..." },
              { key: "facebook", placeholder: "https://facebook.com/..." },
              { key: "tiktok", placeholder: "https://tiktok.com/@..." },
              { key: "whatsapp", placeholder: "https://wa.me/381601234567" },
              { key: "telegram", placeholder: "https://t.me/username" },
            ] as const
          ).map(({ key, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm font-semibold text-gray-600 dark:text-gray-400 capitalize">
                {key}
              </span>
              <input
                className={inp}
                value={hero.socialLinks?.[key] ?? ""}
                onChange={(e) =>
                  updateLandingSection("hero", {
                    ...hero,
                    socialLinks: { ...hero.socialLinks, [key]: e.target.value },
                  })
                }
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

        {/* ── Hero Images — driven by THEME_CONFIG ──────────────────────────── */}
        {(() => {
          const heroConf = themeConf.hero;

          if (!heroConf.hasImage) {
            return (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic px-1">
                Ova tema koristi podrazumevanu sliku za hero sekciju — nije potrebno dodavati sliku.
              </p>
            );
          }

          if (heroConf.maxImages === 1) {
            return (
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
                <p className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 inline-block px-2.5 py-1 rounded-lg">
                  Hero Slika
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Ako ne dodate sliku, prikazaće se podrazumevana slika.
                </p>
                <ImageInputField
                  label="URL slike"
                  value={hero.image?.src ?? ""}
                  onChange={(url) =>
                    updateLandingSection("hero", {
                      ...hero,
                      image: { src: url, alt: hero.image?.alt ?? "" },
                    })
                  }
                />
                <div>
                  <label className={lbl}>Alt tekst</label>
                  <input
                    className={inp}
                    value={hero.image?.alt ?? ""}
                    onChange={(e) =>
                      updateLandingSection("hero", {
                        ...hero,
                        image: { src: hero.image?.src ?? "", alt: e.target.value },
                      })
                    }
                    placeholder="Opis slike za pristupačnost..."
                  />
                </div>
              </div>
            );
          }

          // maxImages > 1 — image grid (e.g. theme-3 with up to 4 images)
          const slots = Array.from({ length: heroConf.maxImages }, (_, i) => i);
          return (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-4">
              <div>
                <p className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 inline-block px-2.5 py-1 rounded-lg">
                  Hero Slike
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                  Koristi se za varijantu &quot;Grid desno&quot;. Preporučeno: {heroConf.maxImages} slike.
                  Ako ne dodate slike, prikazaće se podrazumevane slike.
                </p>
              </div>
              {slots.map((idx) => {
                const img = hero.images?.[idx];
                const updateHeroImages = (src: string, alt: string) => {
                  const imgs = Array.from(
                    { length: Math.max(hero.images?.length ?? 0, idx + 1) },
                    (_, i) => hero.images?.[i] ?? { src: "", alt: "" },
                  );
                  imgs[idx] = { src, alt };
                  updateLandingSection("hero", { ...hero, images: imgs });
                };
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-2"
                  >
                    <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      Slika {idx + 1}
                    </span>
                    <ImageInputField
                      label="URL slike"
                      value={img?.src ?? ""}
                      onChange={(url) => updateHeroImages(url, img?.alt ?? "")}
                    />
                    <div>
                      <label className={lbl}>Alt tekst</label>
                      <input
                        className={inp}
                        value={img?.alt ?? ""}
                        onChange={(e) =>
                          updateHeroImages(img?.src ?? "", e.target.value)
                        }
                        placeholder="Opis slike za pristupačnost..."
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* CTAs */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-4">
          <p className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 inline-block px-2.5 py-1 rounded-lg">
            CTA dugmad
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Primarni CTA — tekst *</label>
              <input
                className={inp}
                value={hero.ctas?.primary?.text ?? ""}
                onChange={(e) =>
                  updateLandingSection("hero", {
                    ...hero,
                    ctas: {
                      ...hero.ctas,
                      primary: { ...hero.ctas.primary, text: e.target.value },
                    },
                  })
                }
                placeholder="Zakaži termin"
              />
            </div>
            <div>
              <label className={lbl}>Primarni CTA — link *</label>
              <input
                className={inp}
                value={hero.ctas?.primary?.href ?? ""}
                onChange={(e) =>
                  updateLandingSection("hero", {
                    ...hero,
                    ctas: {
                      ...hero.ctas,
                      primary: { ...hero.ctas.primary, href: e.target.value },
                    },
                  })
                }
                placeholder="/termini"
              />
            </div>
            <div>
              <label className={lbl}>Sekundarni CTA — tekst</label>
              <input
                className={inp}
                value={hero.ctas?.secondary?.text ?? ""}
                onChange={(e) =>
                  updateLandingSection("hero", {
                    ...hero,
                    ctas: {
                      ...hero.ctas,
                      secondary: {
                        text: e.target.value,
                        href: hero.ctas?.secondary?.href ?? "",
                      },
                    },
                  })
                }
                placeholder="Naše usluge"
              />
            </div>
            <div>
              <label className={lbl}>Sekundarni CTA — link</label>
              <input
                className={inp}
                value={hero.ctas?.secondary?.href ?? ""}
                onChange={(e) =>
                  updateLandingSection("hero", {
                    ...hero,
                    ctas: {
                      ...hero.ctas,
                      secondary: {
                        href: e.target.value,
                        text: hero.ctas?.secondary?.text ?? "",
                      },
                    },
                  })
                }
                placeholder="/usluge"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── ABOUT ────────────────────────────────────────────────────────── */}
      <SectionCard
        title="Landing / O Nama"
        badge="About"
        enabled={about.enabled}
        onToggle={(v) =>
          updateLandingSection("about", { ...about, enabled: v })
        }
      >
        <div>
          <label className={lbl}>Naslov</label>
          <input
            className={inp}
            value={about.headline ?? ""}
            onChange={(e) =>
              updateLandingSection("about", {
                ...about,
                headline: e.target.value,
              })
            }
            placeholder="O nama"
          />
        </div>

        <div className="space-y-2">
          <label className={lbl}>
            Paragrafi{" "}
            <span className="font-normal normal-case text-gray-400 dark:text-gray-600">
              · max 2
            </span>
          </label>
          {(about.paragraphs ?? []).map((p, i) => (
            <div key={i} className="flex gap-2">
              <textarea
                className={inp + " resize-none flex-1"}
                rows={3}
                value={p}
                onChange={(e) => {
                  const updated = [...(about.paragraphs ?? [])];
                  updated[i] = e.target.value;
                  updateLandingSection("about", {
                    ...about,
                    paragraphs: updated,
                  });
                }}
                placeholder={`Paragraf ${i + 1}...`}
              />
              <button
                type="button"
                onClick={() => {
                  const updated = (about.paragraphs ?? []).filter(
                    (_, idx) => idx !== i,
                  );
                  updateLandingSection("about", {
                    ...about,
                    paragraphs: updated,
                  });
                }}
                className="shrink-0 w-8 h-8 mt-1 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
              >
                −
              </button>
            </div>
          ))}
          {(about.paragraphs ?? []).length < 2 && (
            <button
              type="button"
              onClick={() =>
                updateLandingSection("about", {
                  ...about,
                  paragraphs: [...(about.paragraphs ?? []), ""],
                })
              }
              className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
            >
              + Dodaj paragraf
            </button>
          )}
        </div>
      </SectionCard>

      {/* ── SERVICES PREVIEW ─────────────────────────────────────────────── */}
      <SectionCard
        title="Landing / Pregled Usluga"
        badge="Services"
        enabled={servicesPreview.enabled}
        onToggle={(v) =>
          updateLandingSection("servicesPreview", {
            ...servicesPreview,
            enabled: v,
          })
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Naslov</label>
            <input
              className={inp}
              value={servicesPreview.headline ?? ""}
              onChange={(e) =>
                updateLandingSection("servicesPreview", {
                  ...servicesPreview,
                  headline: e.target.value,
                })
              }
              placeholder="Naše usluge"
            />
          </div>
          <div>
            <label className={lbl}>Podtekst</label>
            <input
              className={inp}
              value={servicesPreview.subheadline ?? ""}
              onChange={(e) =>
                updateLandingSection("servicesPreview", {
                  ...servicesPreview,
                  subheadline: e.target.value,
                })
              }
              placeholder="Upoznajte se sa ponudom..."
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Usluge se automatski učitavaju iz baze podataka.
        </p>
      </SectionCard>

      {/* ── APPOINTMENT SECTION ──────────────────────────────────────────── */}
      <SectionCard
        title="Landing / Zakazivanje"
        badge="Appointment"
        enabled={appointmentSection.enabled}
        onToggle={(v) =>
          updateLandingSection("appointmentSection", {
            ...appointmentSection,
            enabled: v,
          })
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Naslov</label>
            <input
              className={inp}
              value={appointmentSection.headline ?? ""}
              onChange={(e) =>
                updateLandingSection("appointmentSection", {
                  ...appointmentSection,
                  headline: e.target.value,
                })
              }
              placeholder="Zakazite termin odmah"
            />
          </div>
          <div>
            <label className={lbl}>Podtekst</label>
            <input
              className={inp}
              value={appointmentSection.subheadline ?? ""}
              onChange={(e) =>
                updateLandingSection("appointmentSection", {
                  ...appointmentSection,
                  subheadline: e.target.value,
                })
              }
              placeholder="Slobodni termini u kalendaru..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className={lbl}>Koraci / Instrukcije</label>
          {(appointmentSection.instructions ?? []).map((instr, i) => (
            <div
              key={i}
              className="flex gap-2 items-start p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Naziv koraka</label>
                  <input
                    className={inp}
                    value={instr.name ?? ""}
                    onChange={(e) => {
                      const updated = [
                        ...(appointmentSection.instructions ?? []),
                      ];
                      updated[i] = { ...instr, name: e.target.value };
                      updateLandingSection("appointmentSection", {
                        ...appointmentSection,
                        instructions: updated,
                      });
                    }}
                    placeholder="npr. Izaberite uslugu"
                  />
                </div>
                <div>
                  <label className={lbl}>Ikona (Heroicon)</label>
                  <select
                    className={inp}
                    value={instr.icon ?? ""}
                    onChange={(e) => {
                      const updated = [
                        ...(appointmentSection.instructions ?? []),
                      ];
                      updated[i] = { ...instr, icon: e.target.value };
                      updateLandingSection("appointmentSection", {
                        ...appointmentSection,
                        instructions: updated,
                      });
                    }}
                  >
                    <option value="">— izaberite ikonu —</option>
                    {HEROICON_OPTIONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = (
                    appointmentSection.instructions ?? []
                  ).filter((_, idx) => idx !== i);
                  updateLandingSection("appointmentSection", {
                    ...appointmentSection,
                    instructions: updated,
                  });
                }}
                className="mt-5 w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
              >
                −
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              updateLandingSection("appointmentSection", {
                ...appointmentSection,
                instructions: [
                  ...(appointmentSection.instructions ?? []),
                  { name: "", icon: "CalendarDaysIcon" },
                ],
              })
            }
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            + Dodaj korak
          </button>
        </div>
      </SectionCard>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <SectionCard
        title="Landing / Preporuke"
        badge="Testimonials"
        enabled={testimonials.enabled}
        onToggle={(v) =>
          updateLandingSection("testimonials", { ...testimonials, enabled: v })
        }
        readonly
      >
        <div>
          <label className={lbl}>Naslov</label>
          <input
            className={inp}
            value={testimonials.headline ?? ""}
            onChange={(e) =>
              updateLandingSection("testimonials", {
                ...testimonials,
                headline: e.target.value,
              })
            }
            placeholder="Šta kažu naši klijenti"
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Sadržaj preporuka se učitava iz baze podataka. Ovde se podešava samo
          naslov.
        </p>
      </SectionCard>

      {/* ── GALLERY ──────────────────────────────────────────────────────── */}
      <SectionCard
        title="Landing / Galerija"
        badge="Gallery"
        enabled={gallery.enabled}
        onToggle={(v) =>
          updateLandingSection("gallery", { ...gallery, enabled: v })
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Naslov</label>
            <input
              className={inp}
              value={gallery.headline ?? ""}
              onChange={(e) =>
                updateLandingSection("gallery", {
                  ...gallery,
                  headline: e.target.value,
                })
              }
              placeholder="Kolekcija"
            />
          </div>
          <div>
            <label className={lbl}>Podtekst</label>
            <input
              className={inp}
              value={gallery.subheadline ?? ""}
              onChange={(e) =>
                updateLandingSection("gallery", {
                  ...gallery,
                  subheadline: e.target.value,
                })
              }
              placeholder="Pogledajte naše radove"
            />
          </div>
        </div>

        {/* Instagram */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
          <p className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 inline-block px-2.5 py-1 rounded-lg">
            Instagram
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Username</label>
              <input
                className={inp}
                value={gallery.instagram?.username ?? ""}
                onChange={(e) =>
                  updateLandingSection("gallery", {
                    ...gallery,
                    instagram: {
                      ...gallery.instagram,
                      username: e.target.value,
                    },
                  })
                }
                placeholder="@marysoll"
              />
            </div>
            <div>
              <label className={lbl}>Link</label>
              <input
                className={inp}
                value={gallery.instagram?.link ?? ""}
                onChange={(e) =>
                  updateLandingSection("gallery", {
                    ...gallery,
                    instagram: { ...gallery.instagram, link: e.target.value },
                  })
                }
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <label className={lbl}>CTA tekst</label>
              <input
                className={inp}
                value={gallery.instagram?.ctaText ?? ""}
                onChange={(e) =>
                  updateLandingSection("gallery", {
                    ...gallery,
                    instagram: {
                      ...gallery.instagram,
                      ctaText: e.target.value,
                    },
                  })
                }
                placeholder="Pogledaj na Instagramu"
              />
            </div>
          </div>
        </div>

        {/* Gallery content — variant driven by THEME_CONFIG */}
        {themeConf.gallery.variant === "images-only" ? (

          /* ── images-only: flat image list (masonry — Theme 3/4/5) ───────── */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className={lbl + " mb-0"}>
                Slike galerije
                <span className="ml-1.5 font-normal normal-case text-gray-400">
                  · samo slike
                </span>
              </label>
              <button
                type="button"
                onClick={() =>
                  updateLandingSection("gallery", {
                    ...gallery,
                    images: [...(gallery.images ?? []), { src: "", alt: "" }],
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition"
              >
                + Dodaj sliku
              </button>
            </div>

            {(gallery.images ?? []).length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">
                Nema slika. Kliknite &quot;+ Dodaj sliku&quot; da dodate prvu.
                <br />
                <span className="text-xs">
                  Ako nema slika, prikazuju se podrazumevane slike.
                </span>
              </p>
            )}

            {(gallery.images ?? []).map((img, ii) => {
              const updateImg = (src: string, alt: string) => {
                const imgs = [...(gallery.images ?? [])];
                imgs[ii] = { src, alt };
                updateLandingSection("gallery", { ...gallery, images: imgs });
              };
              const removeImg = () => {
                const imgs = (gallery.images ?? []).filter((_, idx) => idx !== ii);
                updateLandingSection("gallery", { ...gallery, images: imgs });
              };
              return (
                <div
                  key={ii}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      Slika {ii + 1}
                    </span>
                    <button
                      type="button"
                      onClick={removeImg}
                      className="cursor-pointer w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition text-sm font-bold"
                    >
                      —
                    </button>
                  </div>
                  <ImageInputField
                    label="URL slike"
                    value={img.src ?? ""}
                    onChange={(url) => updateImg(url, img.alt ?? "")}
                  />
                  <div>
                    <label className={lbl}>Alt tekst</label>
                    <input
                      className={inp}
                      value={img.alt ?? ""}
                      onChange={(e) => updateImg(img.src ?? "", e.target.value)}
                      placeholder="Opis slike za pristupačnost..."
                    />
                  </div>
                </div>
              );
            })}
          </div>

        ) : (

          /* ── images-with-category: treatments list (zigzag — Theme 1/2) ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className={lbl + " mb-0"}>
                Stavke galerije
                <span className="ml-1.5 font-normal normal-case text-gray-400">
                  · slika1, slika2, tekst
                </span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const newItem = {
                    id: String(Date.now()),
                    category: "",
                    title: "",
                    description: "",
                    images: [{ src: "", alt: "" }, { src: "", alt: "" }],
                    href: "/termini",
                  };
                  updateLandingSection("gallery", {
                    ...gallery,
                    treatments: [...(gallery.treatments ?? []), newItem],
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition"
              >
                + Dodaj stavku
              </button>
            </div>

            {(gallery.treatments ?? []).length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">
                Nema stavki. Kliknite &quot;+ Dodaj stavku&quot; da dodate prvu.
                <br />
                <span className="text-xs">
                  Ako nema stavki, prikazuju se podrazumevane slike.
                </span>
              </p>
            )}

            {(gallery.treatments ?? []).map((treatment, ti) => {
              const updateTreatment = (updated: typeof treatment) => {
                const all = [...(gallery.treatments ?? [])];
                all[ti] = updated;
                updateLandingSection("gallery", { ...gallery, treatments: all });
              };
              const removeTreatment = () => {
                const all = (gallery.treatments ?? []).filter((_, idx) => idx !== ti);
                updateLandingSection("gallery", { ...gallery, treatments: all });
              };

              return (
                <div
                  key={treatment.id || ti}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-4"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-2.5 py-1 rounded-lg">
                      Stavka {ti + 1}
                    </span>
                    <button
                      type="button"
                      onClick={removeTreatment}
                      className="cursor-pointer w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-base font-bold"
                    >
                      —
                    </button>
                  </div>

                  {/* Meta fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Kategorija</label>
                      <input
                        className={inp}
                        value={treatment.category ?? ""}
                        onChange={(e) =>
                          updateTreatment({ ...treatment, category: e.target.value })
                        }
                        placeholder="npr. Makeup"
                      />
                    </div>
                    <div>
                      <label className={lbl}>Link (href)</label>
                      <input
                        className={inp}
                        value={treatment.href ?? ""}
                        onChange={(e) =>
                          updateTreatment({ ...treatment, href: e.target.value })
                        }
                        placeholder="/termini"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={lbl}>Naziv</label>
                      <input
                        className={inp}
                        value={treatment.title ?? ""}
                        onChange={(e) =>
                          updateTreatment({ ...treatment, title: e.target.value })
                        }
                        placeholder="npr. Dnevna šminka"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={lbl}>Opis</label>
                      <textarea
                        className={inp + " resize-none"}
                        rows={2}
                        value={treatment.description ?? ""}
                        onChange={(e) =>
                          updateTreatment({ ...treatment, description: e.target.value })
                        }
                        placeholder="Kratki opis tretmana..."
                      />
                    </div>
                  </div>

                  {/* Images (max 2 per treatment) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className={lbl + " mb-0"}>
                        Slike
                        <span className="ml-1.5 font-normal normal-case text-gray-400">
                          · max 2
                        </span>
                      </label>
                      {(treatment.images ?? []).length < 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateTreatment({
                              ...treatment,
                              images: [...(treatment.images ?? []), { src: "", alt: "" }],
                            })
                          }
                          className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
                        >
                          + Dodaj sliku
                        </button>
                      )}
                    </div>

                    {(treatment.images ?? []).map((img, ii) => {
                      const updateImg = (updated: { src: string; alt: string }) => {
                        const imgs = [...(treatment.images ?? [])];
                        imgs[ii] = updated;
                        updateTreatment({ ...treatment, images: imgs });
                      };
                      const removeImg = () => {
                        const imgs = (treatment.images ?? []).filter((_, idx) => idx !== ii);
                        updateTreatment({ ...treatment, images: imgs });
                      };
                      return (
                        <div
                          key={ii}
                          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                              Slika {ii + 1}
                            </span>
                            <button
                              type="button"
                              onClick={removeImg}
                              className="cursor-pointer w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition text-sm font-bold"
                            >
                              —
                            </button>
                          </div>
                          <ImageInputField
                            label="URL slike"
                            value={img.src ?? ""}
                            onChange={(url) => updateImg({ ...img, src: url })}
                          />
                          <div>
                            <label className={lbl}>Alt tekst</label>
                            <input
                              className={inp}
                              value={img.alt ?? ""}
                              onChange={(e) => updateImg({ ...img, alt: e.target.value })}
                              placeholder="Opis slike za pristupačnost..."
                            />
                          </div>
                        </div>
                      );
                    })}

                    {(treatment.images ?? []).length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                        Nema slika. Kliknite &quot;+ Dodaj sliku&quot;.
                      </p>
                    )}
                  </div>

                  {/* Insert after this card */}
                  <button
                    type="button"
                    onClick={() => {
                      const newItem = {
                        id: String(Date.now()),
                        category: "",
                        title: "",
                        description: "",
                        images: [{ src: "", alt: "" }, { src: "", alt: "" }],
                        href: "/termini",
                      };
                      const all = [...(gallery.treatments ?? [])];
                      all.splice(ti + 1, 0, newItem);
                      updateLandingSection("gallery", { ...gallery, treatments: all });
                    }}
                    className="w-full mt-1 py-2 text-xs font-semibold rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-700 text-violet-500 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition"
                  >
                    + Dodaj stavku ispod
                  </button>
                </div>
              );
            })}

            {(gallery.treatments ?? []).length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const newItem = {
                    id: String(Date.now()),
                    category: "",
                    title: "",
                    description: "",
                    images: [{ src: "", alt: "" }, { src: "", alt: "" }],
                    href: "/termini",
                  };
                  updateLandingSection("gallery", {
                    ...gallery,
                    treatments: [...(gallery.treatments ?? []), newItem],
                  });
                }}
                className="w-full py-3 text-xs font-semibold rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-700 text-violet-500 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition"
              >
                + Dodaj stavku na kraj
              </button>
            )}
          </div>
        )}
      </SectionCard>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <SectionCard
        title="Landing / FAQ"
        badge="FAQ"
        enabled={faq.enabled}
        onToggle={(v) => updateLandingSection("faq", { ...faq, enabled: v })}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Naslov</label>
            <input
              className={inp}
              value={faq.headline ?? ""}
              onChange={(e) =>
                updateLandingSection("faq", {
                  ...faq,
                  headline: e.target.value,
                })
              }
              placeholder="Često postavljana pitanja"
            />
          </div>
          <div>
            <label className={lbl}>Podtekst</label>
            <input
              className={inp}
              value={faq.subheadline ?? ""}
              onChange={(e) =>
                updateLandingSection("faq", {
                  ...faq,
                  subheadline: e.target.value,
                })
              }
              placeholder="Odgovori na vaša pitanja"
            />
          </div>
        </div>

        {/* Support */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Tekst za podršku</label>
            <input
              className={inp}
              value={faq.support?.text ?? ""}
              onChange={(e) =>
                updateLandingSection("faq", {
                  ...faq,
                  support: { ...faq.support, text: e.target.value },
                })
              }
              placeholder="Obratite se korisničkoj podršci"
            />
          </div>
          <div>
            <label className={lbl}>Email podrške</label>
            <input
              className={inp}
              type="email"
              value={faq.support?.email ?? ""}
              onChange={(e) =>
                updateLandingSection("faq", {
                  ...faq,
                  support: { ...faq.support, email: e.target.value },
                })
              }
              placeholder="podrska@salon.com"
            />
          </div>
        </div>

        {/* FAQ items */}
        <div className="space-y-3">
          <label className={lbl}>Pitanja i odgovori</label>
          {(faq.items ?? []).map((item, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 space-y-2"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    className={inp}
                    value={item.question ?? ""}
                    onChange={(e) => {
                      const updated = [...(faq.items ?? [])];
                      updated[i] = { ...item, question: e.target.value };
                      updateLandingSection("faq", { ...faq, items: updated });
                    }}
                    placeholder="Pitanje..."
                  />
                  <textarea
                    className={inp + " resize-none"}
                    rows={2}
                    value={item.answer ?? ""}
                    onChange={(e) => {
                      const updated = [...(faq.items ?? [])];
                      updated[i] = { ...item, answer: e.target.value };
                      updateLandingSection("faq", { ...faq, items: updated });
                    }}
                    placeholder="Odgovor..."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = (faq.items ?? []).filter(
                      (_, idx) => idx !== i,
                    );
                    updateLandingSection("faq", { ...faq, items: updated });
                  }}
                  className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                >
                  −
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              updateLandingSection("faq", {
                ...faq,
                items: [...(faq.items ?? []), { question: "", answer: "" }],
              })
            }
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            + Dodaj pitanje
          </button>
        </div>
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════════
          PAGES
          ══════════════════════════════════════════════════════════════════ */}

      <div className={card}>
        <h3 className="font-bold text-gray-900 dark:text-white mb-5">
          Stranice
        </h3>
        <div className="space-y-5">
          {/* Services page */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-2.5 py-1 rounded-lg inline-block">
              Stranica Usluga
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Naslov</label>
                <input
                  className={inp}
                  value={servicesPage.headline ?? ""}
                  onChange={(e) =>
                    updatePagesSection("servicesPage", {
                      ...servicesPage,
                      headline: e.target.value,
                    })
                  }
                  placeholder="Naše usluge"
                />
              </div>
              <div>
                <label className={lbl}>Podtekst</label>
                <input
                  className={inp}
                  value={servicesPage.subheadline ?? ""}
                  onChange={(e) =>
                    updatePagesSection("servicesPage", {
                      ...servicesPage,
                      subheadline: e.target.value,
                    })
                  }
                  placeholder="Kompletna ponuda tretmana"
                />
              </div>
            </div>
          </div>

          {/* Appointments page */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-2.5 py-1 rounded-lg inline-block">
              Stranica Termina
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Naslov</label>
                <input
                  className={inp}
                  value={appointmentsPage.headline ?? ""}
                  onChange={(e) =>
                    updatePagesSection("appointmentsPage", {
                      ...appointmentsPage,
                      headline: e.target.value,
                    })
                  }
                  placeholder="Zakaži termin"
                />
              </div>
              <div>
                <label className={lbl}>Podtekst</label>
                <input
                  className={inp}
                  value={appointmentsPage.subheadline ?? ""}
                  onChange={(e) =>
                    updatePagesSection("appointmentsPage", {
                      ...appointmentsPage,
                      subheadline: e.target.value,
                    })
                  }
                  placeholder="Izaberi slobodan termin..."
                />
              </div>
              <div>
                <label className={lbl}>CTA Primarni — tekst</label>
                <input
                  className={inp}
                  value={appointmentsPage.ctas?.primary?.text ?? ""}
                  onChange={(e) =>
                    updatePagesSection("appointmentsPage", {
                      ...appointmentsPage,
                      ctas: {
                        ...appointmentsPage.ctas,
                        primary: {
                          ...appointmentsPage.ctas?.primary,
                          text: e.target.value,
                          href: appointmentsPage.ctas?.primary?.href ?? "",
                        },
                      },
                    })
                  }
                  placeholder="Zakaži odmah"
                />
              </div>
              <div>
                <label className={lbl}>CTA Primarni — link</label>
                <input
                  className={inp}
                  value={appointmentsPage.ctas?.primary?.href ?? ""}
                  onChange={(e) =>
                    updatePagesSection("appointmentsPage", {
                      ...appointmentsPage,
                      ctas: {
                        ...appointmentsPage.ctas,
                        primary: {
                          ...appointmentsPage.ctas?.primary,
                          href: e.target.value,
                          text: appointmentsPage.ctas?.primary?.text ?? "",
                        },
                      },
                    })
                  }
                  placeholder="/termini"
                />
              </div>
              <div>
                <label className={lbl}>CTA Sekundarni — tekst</label>
                <input
                  className={inp}
                  value={appointmentsPage.ctas?.secondary?.text ?? ""}
                  onChange={(e) =>
                    updatePagesSection("appointmentsPage", {
                      ...appointmentsPage,
                      ctas: {
                        ...appointmentsPage.ctas,
                        secondary: {
                          ...appointmentsPage.ctas?.secondary,
                          text: e.target.value,
                          href: appointmentsPage.ctas?.secondary?.href ?? "",
                        },
                      },
                    })
                  }
                  placeholder="Pogledaj usluge"
                />
              </div>
              <div>
                <label className={lbl}>CTA Sekundarni — link</label>
                <input
                  className={inp}
                  value={appointmentsPage.ctas?.secondary?.href ?? ""}
                  onChange={(e) =>
                    updatePagesSection("appointmentsPage", {
                      ...appointmentsPage,
                      ctas: {
                        ...appointmentsPage.ctas,
                        secondary: {
                          ...appointmentsPage.ctas?.secondary,
                          href: e.target.value,
                          text: appointmentsPage.ctas?.secondary?.text ?? "",
                        },
                      },
                    })
                  }
                  placeholder="/usluge"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={sp.isSaving}
            className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
          >
            {sp.isSaving ? "Snimanje..." : "Sačuvaj sve"}
          </button>
        </div>
      </div>
    </div>
  );
}
