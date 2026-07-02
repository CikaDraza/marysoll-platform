"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSalonProfileAdmin } from "@/hooks/useSalonProfileAdmin";
import { useAdminServices } from "@/hooks/useAdminServices";
import { useQueryClient } from "@tanstack/react-query";
import type { LandingStructure, LandingTheme } from "@/types";
import type { SeoFinding, TechnicalAuditReport } from "@/types/seo-report";
import { SeoFindings } from "@/components/seo/SeoFindings";
import { ImageSelect } from "@/components/elements/ImageSelect";
import { ArrowUpIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import LoaderButton from "@/components/elements/LoaderButton";
import Image from "next/image";
import { THEME_CONFIG } from "@/lib/themeConfig";
import BlowDryingIcon from "@/components/assets/icons/services/BlowDryingIcon";
import EyebrowsIcon from "@/components/assets/icons/services/EyebrowsIcon";
import FigaroIcon from "@/components/assets/icons/services/FigaroIcon";
import FlowerIcon from "@/components/assets/icons/services/FlowerIcon";
import HairIcon from "@/components/assets/icons/services/Hair";
import HaircutIcon from "@/components/assets/icons/services/HaricutIcon";
import MakeupFaceIcon from "@/components/assets/icons/services/MakeupFaceIcon";
import MassageIcon from "@/components/assets/icons/services/MassageIcon";

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

const sectionCardBase =
  "rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

const sectionCardTone = {
  odd: "bg-white dark:bg-gray-900",
  even: "bg-gray-50 dark:bg-gray-950",
};

const PAGE_PARAGRAPH_MAX = 310;

const CTA_ANCHORS = [
  { label: "Zakazivanje", value: "#booking" },
  { label: "Usluge", value: "#services" },
  { label: "Cenovnik", value: "#prices" },
  { label: "Galerija", value: "#gallery" },
];

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

// ─── Service icons ────────────────────────────────────────────────────────────

import type { ComponentType } from "react";
import { LymphDrainageIcon } from "@/components/assets/icons/services/LymphDrainageIcon";
import { ManualMassageIcon } from "@/components/assets/icons/services/ManualMassageIcon";
import { VacuumTreatmentIcon } from "@/components/assets/icons/services/VacuumTreatmentIcon";
import { ThermoBlanketIcon } from "@/components/assets/icons/services/ThermoBlanketIcon";
import { MaderoTherapyHandIcon } from "@/components/assets/icons/services/MaderoTherapyHandIcon";
import { MaderoTherapyRollerIcon } from "@/components/assets/icons/services/MaderoTherapyRollerIcon";
import { BodyShapeSlimIcon } from "@/components/assets/icons/services/BodyShapeSlimIcon";

type ServiceIconProps = {
  bgColor?: string;
  width?: number;
  height?: number;
  hasCircle?: boolean;
};
type ServiceIconComp = ComponentType<ServiceIconProps>;

const SERVICE_ICONS: Record<string, ServiceIconComp> = {
  BlowDryingIcon,
  EyebrowsIcon,
  FigaroIcon,
  FlowerIcon,
  HairIcon,
  HaircutIcon,
  MakeupFaceIcon,
  MassageIcon,
  LymphDrainageIcon,
  ManualMassageIcon,
  VacuumTreatmentIcon,
  ThermoBlanketIcon,
  MaderoTherapyHandIcon,
  MaderoTherapyRollerIcon,
  BodyShapeSlimIcon,
};

const SERVICE_ICON_LABELS: Record<string, string> = {
  BlowDryingIcon: "Feniranje",
  EyebrowsIcon: "Obrve",
  FigaroIcon: "Figaro",
  FlowerIcon: "Cvet",
  HairIcon: "Kosa",
  HaircutIcon: "Šišanje",
  MakeupFaceIcon: "Šminka",
  MassageIcon: "Masaža",
  LymphDrainageIcon: "Limfna Drenaza",
  ManualMassageIcon: "Rucna Masaza",
  VacuumTreatmentIcon: "Vakuum Tretman",
  ThermoBlanketIcon: "Termo Cebe",
  MaderoTherapyHandIcon: "Maderoterapija-telo-ruke",
  MaderoTherapyRollerIcon: "Maderoterapija",
  BodyShapeSlimIcon: "Shape-Slim",
};

// ─── SEO types ────────────────────────────────────────────────────────────────

export interface SeoAnalysisResult {
  score: number;
  issues: string[];
  suggestions: string[];
  keywords: string[];
  findings?: SeoFinding[];
  technical?: TechnicalAuditReport;
  snapshotSource?: "cms" | "rendered-dom";
  crawlUrl?: string;
  crawlError?: string;
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
  tone = "odd",
}: {
  title: string;
  badge?: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
  readonly?: boolean;
  tone?: keyof typeof sectionCardTone;
}) {
  return (
    <div className={`${sectionCardBase} ${sectionCardTone[tone]}`}>
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

function CtaAnchorBadges({ onSelect }: { onSelect: (href: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {CTA_ANCHORS.map((anchor) => (
        <button
          key={anchor.value}
          type="button"
          onClick={() => onSelect(anchor.value)}
          className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-600 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30"
        >
          {anchor.label} {anchor.value}
        </button>
      ))}
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
  const { token } = useAuth();
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
      headers: token ? { Authorization: `Bearer ${token}` } : {},
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
        <label
          className={`shrink-0 px-3 py-2.5 text-xs font-semibold rounded-xl border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 ${uploading ? "bg-gray-500 dark:bg-gray-800" : "hover:bg-gray-100 dark:hover:bg-gray-800"} transition cursor-pointer flex items-center`}
        >
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
  const themeConf =
    THEME_CONFIG[(sp.form.landingTheme as LandingTheme) ?? "theme-1"];

  const { services } = useAdminServices();
  const qc = useQueryClient();

  const [seoResult, setSeoResult] = useState<SeoAnalysisResult | null>(null);
  const [showSeoPanel, setShowSeoPanel] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [isTypoFixing, setIsTypoFixing] = useState(false);
  const [iconPickerServiceId, setIconPickerServiceId] = useState<string | null>(
    null,
  );
  const [iconSaving, setIconSaving] = useState<string | null>(null);

  const updateServiceIcon = async (serviceId: string, icon: string) => {
    if (!token) return;
    setIconSaving(serviceId);
    try {
      const res = await fetch(`/api/services/${serviceId}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ icon }),
      });
      if (!res.ok) throw new Error();
      qc.invalidateQueries({ queryKey: ["services"] });
      setIconPickerServiceId(null);
      toast.success("Ikonica sačuvana!");
    } catch {
      toast.error("Greška pri čuvanju ikonice");
    } finally {
      setIconSaving(null);
    }
  };

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

  // ── Save + on-demand SEO analysis ────────────────────────────────────────

  const scrollToTop = () => {
    window.requestAnimationFrame(() => {
      document.scrollingElement?.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    });
  };

  const buildSeoContext = () => ({
    salon: {
      name: sp.form.name,
      city: sp.form.city,
      street: sp.form.street,
    },
    services: services.map((service) => {
      const variantPrices = (service.variants ?? [])
        .map((variant) => variant.price)
        .filter((price): price is number => Number.isFinite(price));
      const groupedPrices = (service.services ?? [])
        .map((item) => item.price)
        .filter((price): price is number => Number.isFinite(price));
      const prices = [
        ...(service.basePrice != null ? [service.basePrice] : []),
        ...variantPrices,
        ...groupedPrices,
      ];
      const variantDurations = (service.variants ?? [])
        .map((variant) => variant.duration)
        .filter((duration): duration is number => Number.isFinite(duration));
      const groupedDurations = (service.services ?? [])
        .map((item) => item.duration)
        .filter((duration): duration is number => Number.isFinite(duration));
      const durations = [
        ...(service.duration != null ? [service.duration] : []),
        ...variantDurations,
        ...groupedDurations,
      ];

      return {
        name: service.name,
        category: service.category,
        subcategory: service.subcategory,
        description: service.description,
        basePrice: service.basePrice,
        priceMode: service.priceMode,
        duration: service.duration,
        type: service.type,
        priceFrom: prices.length > 0 ? Math.min(...prices) : null,
        durationFrom: durations.length > 0 ? Math.min(...durations) : null,
        hasPriceOnRequest:
          service.priceMode === "on_request" ||
          service.variants?.some(
            (variant) => variant.priceMode === "on_request",
          ) ||
          service.services?.some((item) => item.priceMode === "on_request") ||
          false,
        variants: service.variants?.map((variant) => ({
          name: variant.name,
          price: variant.price,
          priceMode: variant.priceMode,
          duration: variant.duration,
        })),
        groupedServices: service.services?.map((item) => ({
          name: item.name,
          price: item.price,
          priceMode: item.priceMode,
          duration: item.duration,
          description: item.description,
        })),
      };
    }),
    workingHours: sp.form.workingHours,
    platformKnowledge: {
      servicesPreviewHasCatalogWidget: true,
      servicesPageHasFullCatalogPricesDurationsAndBookingLinks: true,
      appointmentSectionHasBookingWidget: true,
      appointmentsPageHasBookingCalendarServiceSelectionAndWorkingHours: true,
      testimonialsContentComesFromDatabase: true,
    },
  });

  const handleSave = () => {
    if (artists?.enabled) {
      if (!(artists?.headline ?? "").trim()) {
        toast.error("Artists: Naslov sekcije je obavezan.");
        return;
      }
      const missingImage = (artists?.members ?? []).some(
        (m) => !m.image?.src?.trim(),
      );
      if (missingImage) {
        toast.error("Artists: Svaki artist mora imati sliku.");
        return;
      }
    }
    sp.save(undefined, {
      onSuccess: () => {
        setSeoResult(null);
        setShowSeoPanel(true);
        scrollToTop();
      },
    });
  };

  const runSeoAnalysis = async () => {
    if (!token) {
      toast.error("Niste prijavljeni.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/landing-cms/seo-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          landingStructure: ls,
          seoContext: buildSeoContext(),
        }),
      });
      if (!res.ok) throw new Error("SEO analiza neuspešna");
      const data = await res.json();
      setSeoResult(data);
      setShowSeoPanel(true);
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
          seoContext: buildSeoContext(),
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

  const handleTypoFix = async () => {
    if (!token) {
      toast.error("Niste prijavljeni.");
      return;
    }
    setIsTypoFixing(true);
    try {
      const res = await fetch("/api/landing-cms/typo-fix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ landingStructure: ls }),
      });
      if (!res.ok) throw new Error("Ispravka typo grešaka neuspešna");
      const { landingStructure: fixed } = await res.json();
      updateLS(fixed);
      toast.success("Typo greške ispravljene! Proverite i sačuvajte.");
    } catch {
      toast.error("Ispravka typo grešaka nije uspela");
    } finally {
      setIsTypoFixing(false);
    }
  };

  // ── Shortcuts ────────────────────────────────────────────────────────────

  const hero = ls.landing.hero;
  const about = ls.landing.about;
  const artists = ls.landing.artists;
  const servicesPreview = ls.landing.servicesPreview;
  const appointmentSection = ls.landing.appointmentSection;
  const testimonials = ls.landing.testimonials;
  const gallery = ls.landing.gallery;
  const faq = ls.landing.faq;
  const blog = ls.landing.blog ?? { enabled: false };
  const perks = ls.landing.perks ?? {
    enabled: false,
    pill: "",
    eyebrow: "",
    headline: "",
    paragraphs: [],
    images: [],
    ctas: { primary: { text: "", href: "" }, secondary: { text: "", href: "" } },
  };
  const servicesPage = ls.pages.servicesPage;
  const appointmentsPage = ls.pages.appointmentsPage;

  return (
    <div className="relative mt-6 min-h-screen space-y-6">
      {/* ── Save bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-center justify-between">
        <div className="mb-4 lg:mb-0">
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
            type="button"
            onClick={scrollToTop}
            title="Na vrh stranice"
            className="fixed bottom-6 right-6 z-30 inline-flex size-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-lg transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ArrowUpIcon className="size-5" aria-hidden="true" />
            <span className="sr-only">Na vrh stranice</span>
          </button>
          <button
            type="button"
            onClick={handleTypoFix}
            disabled={isTypoFixing}
            title="Ispravlja samo pravopisne/typo greške, bez SEO prepravke"
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 text-white text-sm font-bold rounded-xl hover:bg-sky-700 transition disabled:opacity-50"
          >
            {isTypoFixing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                Ispravljanje...
              </>
            ) : (
              "✓ Ispravi typo greške"
            )}
          </button>
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
      {showSeoPanel && (
        <div className={card + " space-y-4"}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-gray-900 dark:text-white">
                SEO Analiza
              </h3>
              {seoResult && <SeoBadge score={seoResult.score} />}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={runSeoAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                    Analiziram...
                  </>
                ) : (
                  "Pokreni SEO analizu"
                )}
              </button>
              {seoResult && (
                <button
                  type="button"
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
              )}
            </div>
          </div>

          {!seoResult && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sačuvajte Landing pre AI SEO analize. Agent analizira poslednju
              sačuvanu javnu stranicu, ne nesnimljene izmene iz CMS polja.
            </p>
          )}

          {seoResult?.snapshotSource && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Snapshot:{" "}
              <span className="font-semibold text-violet-600 dark:text-violet-400">
                {seoResult.snapshotSource === "rendered-dom"
                  ? "renderovana javna stranica"
                  : "CMS fallback"}
              </span>
              {seoResult.crawlError ? ` — ${seoResult.crawlError}` : ""}
            </p>
          )}

          {seoResult?.findings?.length ? (
            <SeoFindings
              findings={seoResult.findings}
              technical={seoResult.technical}
              variant="tenant"
            />
          ) : (
            <>
              {seoResult && seoResult.issues.length > 0 && (
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

              {seoResult && seoResult.suggestions.length > 0 && (
                <div>
                  <p className={lbl}>Preporuke</p>
                  <ul className="space-y-1.5">
                    {seoResult.suggestions.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="mt-0.5 shrink-0 text-violet-500">
                          →
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {seoResult && seoResult.keywords.length > 0 && (
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
        tone="odd"
        enabled={hero.enabled}
        onToggle={(v) => updateLandingSection("hero", { ...hero, enabled: v })}
      >
        {/* Basic hero text — hidden for theme-8 (Y2K uses its own block below) */}
        {sp.form.landingTheme !== "theme-8" && (
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
        )}

        {/* ── Theme-8 (Y2K) hero text — only shown for theme-8 ─────────────── */}
        {sp.form.landingTheme === "theme-8" && (
          <div className="rounded-2xl border border-pink-100 dark:border-pink-900/40 bg-pink-50/60 dark:bg-pink-950/20 p-4 space-y-4">
            <div>
              <p className="text-xs font-bold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30 inline-block px-2.5 py-1 rounded-lg">
                Y2K Hero tekst (theme-8)
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                Prazna polja koriste podrazumevane vrednosti teme.
              </p>
            </div>

            {/* Subheadline — theme-8 still uses the hero paragraph */}
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

            {/* Eyebrow */}
            <div>
              <label className={lbl}>Eyebrow (bedž iznad naslova)</label>
              <input
                className={inp}
                value={hero.theme8?.eyebrow ?? ""}
                onChange={(e) =>
                  updateLandingSection("hero", {
                    ...hero,
                    theme8: { ...hero.theme8, eyebrow: e.target.value },
                  })
                }
                placeholder="Cute? Always. Basic? Never."
              />
            </div>

            {/* Wordmark — one field per styled span */}
            <div className="space-y-2">
              <label className={lbl}>Naslov (Wordmark) — po redovima</label>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { key: "prefix", label: "Gornji red", placeholder: "The" },
                    {
                      key: "tail",
                      label: "Potpis (script)",
                      placeholder: "by Anja",
                    },
                    {
                      key: "line1",
                      label: "Red 1 (hrom)",
                      placeholder: "LASH",
                    },
                    {
                      key: "line2",
                      label: "Red 2 (pink)",
                      placeholder: "ROOM",
                    },
                  ] as const
                ).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className={lbl}>{label}</label>
                    <input
                      className={inp}
                      value={hero.theme8?.wordmark?.[key] ?? ""}
                      onChange={(e) =>
                        updateLandingSection("hero", {
                          ...hero,
                          theme8: {
                            ...hero.theme8,
                            wordmark: {
                              ...hero.theme8?.wordmark,
                              [key]: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Ostavi prazno da se naslov automatski izvuče iz imena salona.
              </p>
            </div>

            {/* Marquee */}
            <div>
              <label className={lbl}>Marquee traka (po jedan pojam u redu)</label>
              <textarea
                className={inp + " resize-none"}
                rows={4}
                value={(hero.theme8?.marquee ?? []).join("\n")}
                onChange={(e) =>
                  updateLandingSection("hero", {
                    ...hero,
                    theme8: {
                      ...hero.theme8,
                      marquee: e.target.value.split("\n"),
                    },
                  })
                }
                placeholder={"CLASSIC\nHYBRID\nVOLUMEN\nLASH LIFT"}
              />
            </div>

            {/* Photo captions */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Natpis na glavnoj slici</label>
                <input
                  className={inp}
                  value={hero.theme8?.photoCaptions?.primary ?? ""}
                  onChange={(e) =>
                    updateLandingSection("hero", {
                      ...hero,
                      theme8: {
                        ...hero.theme8,
                        photoCaptions: {
                          ...hero.theme8?.photoCaptions,
                          primary: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="that cat's eye effect ✶"
                />
              </div>
              <div>
                <label className={lbl}>Natpis na slici osnivača</label>
                <input
                  className={inp}
                  value={hero.theme8?.photoCaptions?.founder ?? ""}
                  onChange={(e) =>
                    updateLandingSection("hero", {
                      ...hero,
                      theme8: {
                        ...hero.theme8,
                        photoCaptions: {
                          ...hero.theme8?.photoCaptions,
                          founder: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="Anja, your artist ♡"
                />
              </div>
            </div>
          </div>
        )}

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

          // Theme-8 collage uses two role-specific photos (hero.images[0..1]).
          if (sp.form.landingTheme === "theme-8") {
            const setHeroImg = (idx: number, src: string, alt: string) => {
              const imgs = Array.from(
                { length: Math.max(hero.images?.length ?? 0, idx + 1) },
                (_, i) => hero.images?.[i] ?? { src: "", alt: "" },
              );
              imgs[idx] = { src, alt };
              updateLandingSection("hero", { ...hero, images: imgs });
            };
            const heroSlots = [
              { idx: 0, label: "Glavna slika (krupni plan)" },
              { idx: 1, label: "Slika osnivača (polaroid)" },
            ];
            return (
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-4">
                <div>
                  <p className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 inline-block px-2.5 py-1 rounded-lg">
                    Hero Slike
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                    Dve slike za kolaž. Prazna polja koriste podrazumevane slike.
                  </p>
                </div>
                {heroSlots.map(({ idx, label }) => {
                  const img = hero.images?.[idx];
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-2"
                    >
                      <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        {label}
                      </span>
                      <ImageInputField
                        label="URL slike"
                        value={img?.src ?? ""}
                        onChange={(url) => setHeroImg(idx, url, img?.alt ?? "")}
                      />
                      <div>
                        <label className={lbl}>Alt tekst</label>
                        <input
                          className={inp}
                          value={img?.alt ?? ""}
                          onChange={(e) =>
                            setHeroImg(idx, img?.src ?? "", e.target.value)
                          }
                          placeholder="Opis slike za pristupačnost..."
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          if (!heroConf.hasImage) {
            return (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic px-1">
                Ova tema koristi podrazumevanu sliku za hero sekciju — nije
                potrebno dodavati sliku.
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
                        image: {
                          src: hero.image?.src ?? "",
                          alt: e.target.value,
                        },
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
                  Koristi se za varijantu &quot;Grid desno&quot;. Preporučeno:{" "}
                  {heroConf.maxImages} slike. Ako ne dodate slike, prikazaće se
                  podrazumevane slike.
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
              <CtaAnchorBadges
                onSelect={(href) =>
                  updateLandingSection("hero", {
                    ...hero,
                    ctas: {
                      ...hero.ctas,
                      primary: { ...hero.ctas.primary, href },
                    },
                  })
                }
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
              <CtaAnchorBadges
                onSelect={(href) =>
                  updateLandingSection("hero", {
                    ...hero,
                    ctas: {
                      ...hero.ctas,
                      secondary: {
                        href,
                        text: hero.ctas?.secondary?.text ?? "",
                      },
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── ABOUT ────────────────────────────────────────────────────────── */}
      <SectionCard
        title="Landing / O Nama"
        badge="About"
        tone="even"
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

        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 inline-block px-2.5 py-1 rounded-lg">
                Linkovi u tekstu
              </p>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Tekst mora da postoji u paragrafu. Pronađeni tekst će biti
                prikazan kao link, mention ili tag.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                updateLandingSection("about", {
                  ...about,
                  links: [
                    ...(about.links ?? []),
                    { text: "", url: "", type: "link" },
                  ],
                })
              }
              className="shrink-0 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              + Dodaj
            </button>
          </div>

          <div className="space-y-3">
            {(about.links ?? []).map((link, i) => (
              <div
                key={i}
                className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_140px_32px] gap-2 items-start"
              >
                <input
                  className={inp}
                  value={link.text}
                  onChange={(e) => {
                    const updated = [...(about.links ?? [])];
                    updated[i] = { ...link, text: e.target.value };
                    updateLandingSection("about", {
                      ...about,
                      links: updated,
                    });
                  }}
                  placeholder="Tekst za link, npr. MAGNETIC nail"
                />
                <input
                  className={inp}
                  value={link.url}
                  onChange={(e) => {
                    const updated = [...(about.links ?? [])];
                    updated[i] = { ...link, url: e.target.value };
                    updateLandingSection("about", {
                      ...about,
                      links: updated,
                    });
                  }}
                  placeholder="https://..."
                />
                <select
                  className={inp}
                  value={link.type}
                  onChange={(e) => {
                    const updated = [...(about.links ?? [])];
                    updated[i] = {
                      ...link,
                      type: e.target.value as "link" | "mention" | "tag",
                    };
                    updateLandingSection("about", {
                      ...about,
                      links: updated,
                    });
                  }}
                >
                  <option value="link">Link</option>
                  <option value="mention">Mention</option>
                  <option value="tag">Tag</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const updated = (about.links ?? []).filter(
                      (_, idx) => idx !== i,
                    );
                    updateLandingSection("about", {
                      ...about,
                      links: updated,
                    });
                  }}
                  className="shrink-0 w-8 h-8 mt-1 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                >
                  −
                </button>
              </div>
            ))}
          </div>
        </div>

        {sp.form.landingTheme === "theme-8" ? (
          (() => {
            const setAboutImg = (idx: number, src: string, alt: string) => {
              const imgs = Array.from(
                { length: Math.max(about.images?.length ?? 0, idx + 1) },
                (_, i) => about.images?.[i] ?? { src: "", alt: "" },
              );
              imgs[idx] = { src, alt };
              updateLandingSection("about", { ...about, images: imgs });
            };
            const aboutSlots = [
              { idx: 0, label: "Glavna slika (portret)" },
              { idx: 1, label: "Druga slika (polaroid)" },
            ];
            return (
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-4">
                <div>
                  <p className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 inline-block px-2.5 py-1 rounded-lg">
                    Slike (O nama)
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                    Dve slike za kolaž. Prazna polja koriste podrazumevane slike.
                  </p>
                </div>
                {aboutSlots.map(({ idx, label }) => {
                  const img = about.images?.[idx];
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-2"
                    >
                      <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        {label}
                      </span>
                      <ImageInputField
                        label="URL slike"
                        value={img?.src ?? ""}
                        onChange={(url) => setAboutImg(idx, url, img?.alt ?? "")}
                      />
                      <div>
                        <label className={lbl}>Alt tekst</label>
                        <input
                          className={inp}
                          value={img?.alt ?? ""}
                          onChange={(e) =>
                            setAboutImg(idx, img?.src ?? "", e.target.value)
                          }
                          placeholder="Opis slike za pristupačnost..."
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        ) : (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
            <p className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 inline-block px-2.5 py-1 rounded-lg">
              Slika (O nama)
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Ako ne dodate sliku, prikazaće se podrazumevana slika.
            </p>
            <ImageInputField
              label="URL slike"
              value={about.image?.src ?? ""}
              onChange={(url) =>
                updateLandingSection("about", {
                  ...about,
                  image: { src: url, alt: about.image?.alt ?? "" },
                })
              }
            />
            <div>
              <label className={lbl}>Alt tekst</label>
              <input
                className={inp}
                value={about.image?.alt ?? ""}
                onChange={(e) =>
                  updateLandingSection("about", {
                    ...about,
                    image: { src: about.image?.src ?? "", alt: e.target.value },
                  })
                }
                placeholder="Opis slike za pristupačnost..."
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Godina otvaranja</label>
            <input
              className={inp}
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              value={about.openingYear ?? ""}
              onChange={(e) =>
                updateLandingSection("about", {
                  ...about,
                  openingYear: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              placeholder="npr. 2023"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Godine iskustva se računaju automatski i rastu svake godine. Ima
              prednost nad ručnom vrednošću ispod.
            </p>
          </div>
          <div>
            <label className={lbl}>Godina iskustva (ručno)</label>
            <input
              className={inp}
              type="number"
              min={0}
              value={about.yearsOfExperience ?? ""}
              onChange={(e) =>
                updateLandingSection("about", {
                  ...about,
                  yearsOfExperience: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              placeholder="npr. 5"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Koristi se samo ako „Godina otvaranja&quot; nije uneta.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ── PERKS (theme-8) ──────────────────────────────────────────────── */}
      {sp.form.landingTheme === "theme-8" && (
        <SectionCard
          title="Landing / Benefiti"
          badge="Perks"
          tone="odd"
          enabled={perks.enabled}
          onToggle={(v) =>
            updateLandingSection("perks", { ...perks, enabled: v })
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Pill (mali badge na slici)</label>
              <input
                className={inp}
                value={perks.pill ?? ""}
                onChange={(e) =>
                  updateLandingSection("perks", {
                    ...perks,
                    pill: e.target.value,
                  })
                }
                placeholder="tvoj mali benefit ♡"
              />
            </div>
            <div>
              <label className={lbl}>Eyebrow (nadnaslov)</label>
              <input
                className={inp}
                value={perks.eyebrow ?? ""}
                onChange={(e) =>
                  updateLandingSection("perks", {
                    ...perks,
                    eyebrow: e.target.value,
                  })
                }
                placeholder="extra ljubav za tebe"
              />
            </div>
          </div>

          <div>
            <label className={lbl}>Naslov</label>
            <input
              className={inp}
              value={perks.headline ?? ""}
              onChange={(e) =>
                updateLandingSection("perks", {
                  ...perks,
                  headline: e.target.value,
                })
              }
              placeholder="Sitnice koje čine razliku"
            />
          </div>

          {/* Paragrafi — do 4 */}
          <div className="space-y-2">
            <label className={lbl}>
              Paragrafi{" "}
              <span className="font-normal normal-case text-gray-400 dark:text-gray-600">
                · max 4
              </span>
            </label>
            {(perks.paragraphs ?? []).map((p, i) => (
              <div key={i} className="flex gap-2">
                <textarea
                  className={inp + " resize-none flex-1"}
                  rows={2}
                  value={p}
                  onChange={(e) => {
                    const updated = [...(perks.paragraphs ?? [])];
                    updated[i] = e.target.value;
                    updateLandingSection("perks", {
                      ...perks,
                      paragraphs: updated,
                    });
                  }}
                  placeholder={`Paragraf ${i + 1}...`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = (perks.paragraphs ?? []).filter(
                      (_, idx) => idx !== i,
                    );
                    updateLandingSection("perks", {
                      ...perks,
                      paragraphs: updated,
                    });
                  }}
                  className="shrink-0 w-8 h-8 mt-1 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                >
                  −
                </button>
              </div>
            ))}
            {(perks.paragraphs ?? []).length < 4 && (
              <button
                type="button"
                onClick={() =>
                  updateLandingSection("perks", {
                    ...perks,
                    paragraphs: [...(perks.paragraphs ?? []), ""],
                  })
                }
                className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
              >
                + Dodaj paragraf
              </button>
            )}
          </div>

          {/* Slike — više slika (cloudinary galerija / upload / AI) */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 inline-block px-2.5 py-1 rounded-lg">
                  Slike
                </p>
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  Prva slika je glavna (centar). Prazno = podrazumevana slika.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateLandingSection("perks", {
                    ...perks,
                    images: [...(perks.images ?? []), { src: "", alt: "" }],
                  })
                }
                className="shrink-0 text-sm text-violet-600 dark:text-violet-400 hover:underline"
              >
                + Dodaj sliku
              </button>
            </div>
            {(perks.images ?? []).map((img, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    {idx === 0 ? "Glavna slika" : `Slika ${idx + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateLandingSection("perks", {
                        ...perks,
                        images: (perks.images ?? []).filter(
                          (_, i) => i !== idx,
                        ),
                      })
                    }
                    className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                  >
                    −
                  </button>
                </div>
                <ImageInputField
                  label="URL slike"
                  value={img?.src ?? ""}
                  onChange={(url) => {
                    const updated = [...(perks.images ?? [])];
                    updated[idx] = { src: url, alt: updated[idx]?.alt ?? "" };
                    updateLandingSection("perks", { ...perks, images: updated });
                  }}
                />
                <div>
                  <label className={lbl}>Alt tekst</label>
                  <input
                    className={inp}
                    value={img?.alt ?? ""}
                    onChange={(e) => {
                      const updated = [...(perks.images ?? [])];
                      updated[idx] = {
                        src: updated[idx]?.src ?? "",
                        alt: e.target.value,
                      };
                      updateLandingSection("perks", {
                        ...perks,
                        images: updated,
                      });
                    }}
                    placeholder="Opis slike za pristupačnost..."
                  />
                </div>
              </div>
            ))}
          </div>

          {/* CTA dugmad — prikazuju se samo ako imaju i tekst i URL */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-4">
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 inline-block px-2.5 py-1 rounded-lg">
              Dugmad (opciono)
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Dugme se prikazuje samo ako su popunjeni i tekst i URL.
            </p>

            <div className="space-y-2">
              <label className={lbl}>Dugme 1 — Registracija</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  className={inp}
                  value={perks.ctas?.primary?.text ?? ""}
                  onChange={(e) =>
                    updateLandingSection("perks", {
                      ...perks,
                      ctas: {
                        ...perks.ctas,
                        primary: {
                          text: e.target.value,
                          href: perks.ctas?.primary?.href ?? "",
                        },
                      },
                    })
                  }
                  placeholder="Registruj se"
                />
                <input
                  className={inp}
                  value={perks.ctas?.primary?.href ?? ""}
                  onChange={(e) =>
                    updateLandingSection("perks", {
                      ...perks,
                      ctas: {
                        ...perks.ctas,
                        primary: {
                          text: perks.ctas?.primary?.text ?? "",
                          href: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="/register"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={lbl}>Dugme 2 — Pravila</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  className={inp}
                  value={perks.ctas?.secondary?.text ?? ""}
                  onChange={(e) =>
                    updateLandingSection("perks", {
                      ...perks,
                      ctas: {
                        ...perks.ctas,
                        secondary: {
                          text: e.target.value,
                          href: perks.ctas?.secondary?.href ?? "",
                        },
                      },
                    })
                  }
                  placeholder="Više o pravilima"
                />
                <input
                  className={inp}
                  value={perks.ctas?.secondary?.href ?? ""}
                  onChange={(e) =>
                    updateLandingSection("perks", {
                      ...perks,
                      ctas: {
                        ...perks.ctas,
                        secondary: {
                          text: perks.ctas?.secondary?.text ?? "",
                          href: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="/pravila-zakazivanja"
                />
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── ARTISTS ──────────────────────────────────────────────────────── */}
      <SectionCard
        title="Landing / Naši Artisti"
        badge="Artists"
        tone="odd"
        enabled={artists?.enabled ?? true}
        onToggle={(v) =>
          updateLandingSection("artists", { ...artists, enabled: v })
        }
      >
        <div>
          <label className={lbl}>
            Naslov sekcije{" "}
            <span className="text-red-400 normal-case font-normal">
              * obavezno
            </span>
          </label>
          <input
            className={inp}
            value={artists?.headline ?? ""}
            onChange={(e) =>
              updateLandingSection("artists", {
                ...artists,
                headline: e.target.value,
              })
            }
            placeholder="Naši Artisti"
          />
          {!(artists?.headline ?? "").trim() && (
            <p className="text-xs text-red-400 mt-1">
              Naslov sekcije je obavezan.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className={lbl}>Članovi tima</label>
            <button
              type="button"
              onClick={() =>
                updateLandingSection("artists", {
                  ...artists,
                  members: [
                    ...(artists?.members ?? []),
                    {
                      name: "",
                      role: "",
                      bio: "",
                      image: { src: "", alt: "" },
                    },
                  ],
                })
              }
              className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
            >
              + Dodaj artista
            </button>
          </div>

          {(artists?.members ?? []).length === 0 && (
            <p className="text-xs text-amber-500 dark:text-amber-400">
              Dodajte bar jednog artista da bi sekcija imala sadržaj.
            </p>
          )}

          {(artists?.members ?? []).map((member, idx) => {
            const members = artists?.members ?? [];
            const update = (patch: Partial<(typeof members)[number]>) => {
              const updated = members.map((m, i) =>
                i === idx ? { ...m, ...patch } : m,
              );
              updateLandingSection("artists", { ...artists, members: updated });
            };
            const hasImage = !!member.image?.src?.trim();

            return (
              <div
                key={idx}
                className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 inline-block px-2.5 py-1 rounded-lg">
                    Artist #{idx + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = members.filter((_, i) => i !== idx);
                      updateLandingSection("artists", {
                        ...artists,
                        members: updated,
                      });
                    }}
                    className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-lg leading-none"
                  >
                    −
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Ime</label>
                    <input
                      className={inp}
                      value={member.name ?? ""}
                      onChange={(e) => update({ name: e.target.value })}
                      placeholder="Ime artista"
                    />
                  </div>
                  <div>
                    <label className={lbl}>Uloga</label>
                    <input
                      className={inp}
                      value={member.role ?? ""}
                      onChange={(e) => update({ role: e.target.value })}
                      placeholder="npr. Šminker, Frizer..."
                    />
                  </div>
                </div>

                <div>
                  <label className={lbl}>
                    Slika{" "}
                    <span className="text-red-400 normal-case font-normal">
                      * obavezna
                    </span>
                  </label>
                  <ImageInputField
                    label="URL slike"
                    value={member.image?.src ?? ""}
                    onChange={(url) =>
                      update({
                        image: { src: url, alt: member.image?.alt ?? "" },
                      })
                    }
                  />
                  {!hasImage && (
                    <p className="text-xs text-red-400 mt-1">
                      Slika je obavezna za prikaz artista.
                    </p>
                  )}
                </div>

                {member.image?.src && (
                  <div>
                    <label className={lbl}>Alt tekst slike</label>
                    <input
                      className={inp}
                      value={member.image?.alt ?? ""}
                      onChange={(e) =>
                        update({
                          image: {
                            src: member.image?.src ?? "",
                            alt: e.target.value,
                          },
                        })
                      }
                      placeholder="Opis slike..."
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Sekcija se prikazuje samo u Theme 5. Ime i uloga nisu obavezni.
        </p>
      </SectionCard>

      {/* ── SERVICES PREVIEW ─────────────────────────────────────────────── */}
      <SectionCard
        title="Landing / Pregled Usluga"
        badge="Services"
        tone="even"
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
        <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Prikaži ikonice
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Ikonice usluga u sekciji na landing stranici
            </p>
          </div>
          <ToggleSwitch
            checked={servicesPreview.showIcons ?? true}
            onChange={(v) =>
              updateLandingSection("servicesPreview", {
                ...servicesPreview,
                showIcons: v,
              })
            }
            label="Prikaži ikonice"
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Usluge se automatski učitavaju iz baze podataka.
        </p>

        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
          <p className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 inline-block px-2.5 py-1 rounded-lg">
            Slika (Usluge)
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Prikazuje se uz listu usluga na landing stranici. Ako ne dodate,
            prikazaće se podrazumevana slika.
          </p>
          <ImageInputField
            label="URL slike"
            value={servicesPreview.image?.src ?? ""}
            onChange={(url) =>
              updateLandingSection("servicesPreview", {
                ...servicesPreview,
                image: { src: url, alt: servicesPreview.image?.alt ?? "" },
              })
            }
          />
          <div>
            <label className={lbl}>Alt tekst</label>
            <input
              className={inp}
              value={servicesPreview.image?.alt ?? ""}
              onChange={(e) =>
                updateLandingSection("servicesPreview", {
                  ...servicesPreview,
                  image: {
                    src: servicesPreview.image?.src ?? "",
                    alt: e.target.value,
                  },
                })
              }
              placeholder="Opis slike za pristupačnost..."
            />
          </div>
        </div>

        {services.length > 0 && (
          <div>
            <label className={lbl}>Ikonice usluga</label>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
              Kliknite na uslugu da dodelite ikonicu koja se prikazuje na
              landing stranici.
            </p>
            <div className="flex flex-wrap gap-2">
              {services.map((service) => {
                const IconComp = service.icon
                  ? SERVICE_ICONS[service.icon]
                  : null;
                const isOpen = iconPickerServiceId === service._id;
                return (
                  <div key={service._id} className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setIconPickerServiceId(isOpen ? null : service._id)
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition ${
                        service.icon
                          ? "border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 text-violet-800 dark:text-violet-300"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      } hover:border-violet-400`}
                    >
                      {IconComp ? (
                        <IconComp width={18} height={18} hasCircle={false} />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-[9px] text-gray-400">
                          +
                        </span>
                      )}
                      <span className="max-w-[140px] truncate">
                        {service.name}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="absolute z-20 top-full mt-1 left-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 grid grid-cols-4 gap-2 min-w-[220px]">
                        {Object.entries(SERVICE_ICONS).map(([name, Comp]) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => updateServiceIcon(service._id, name)}
                            title={SERVICE_ICON_LABELS[name]}
                            disabled={iconSaving === service._id}
                            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition cursor-pointer ${
                              service.icon === name
                                ? "ring-2 ring-violet-500 bg-violet-50 dark:bg-violet-900/20"
                                : ""
                            }`}
                          >
                            <Comp width={30} height={30} hasCircle={false} />
                            <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate w-full text-center leading-tight">
                              {SERVICE_ICON_LABELS[name]}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── APPOINTMENT SECTION ──────────────────────────────────────────── */}
      <SectionCard
        title="Landing / Zakazivanje"
        badge="Appointment"
        tone="odd"
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
        tone="even"
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
        tone="odd"
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

        {/* Gallery type picker */}
        {(() => {
          const effectiveVariant: import("@/lib/themeConfig").GalleryVariant =
            gallery.galleryVariant ?? themeConf.gallery.variant;
          return (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-2">
              <p className={lbl}>Tip galerije</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateLandingSection("gallery", {
                      ...gallery,
                      galleryVariant: "images-only",
                    })
                  }
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold border transition ${
                    effectiveVariant === "images-only"
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-400"
                  }`}
                >
                  Masonry
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateLandingSection("gallery", {
                      ...gallery,
                      galleryVariant: "images-with-category",
                    })
                  }
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold border transition ${
                    effectiveVariant === "images-with-category"
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-400"
                  }`}
                >
                  Slika + Slika + Tekst
                </button>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {effectiveVariant === "images-only"
                  ? "Masonry — slobodna mreža slika bez opisa."
                  : "Zigzag — parovi slika sa kategorijom i opisom."}
              </p>
            </div>
          );
        })()}

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

        {/* Gallery content — variant driven by galleryVariant or THEME_CONFIG fallback */}
        {(gallery.galleryVariant ?? themeConf.gallery.variant) ===
        "images-only" ? (
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
                const imgs = (gallery.images ?? []).filter(
                  (_, idx) => idx !== ii,
                );
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
                    images: [
                      { src: "", alt: "" },
                      { src: "", alt: "" },
                    ],
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
                updateLandingSection("gallery", {
                  ...gallery,
                  treatments: all,
                });
              };
              const removeTreatment = () => {
                const all = (gallery.treatments ?? []).filter(
                  (_, idx) => idx !== ti,
                );
                updateLandingSection("gallery", {
                  ...gallery,
                  treatments: all,
                });
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
                          updateTreatment({
                            ...treatment,
                            category: e.target.value,
                          })
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
                          updateTreatment({
                            ...treatment,
                            href: e.target.value,
                          })
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
                          updateTreatment({
                            ...treatment,
                            title: e.target.value,
                          })
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
                          updateTreatment({
                            ...treatment,
                            description: e.target.value,
                          })
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
                              images: [
                                ...(treatment.images ?? []),
                                { src: "", alt: "" },
                              ],
                            })
                          }
                          className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
                        >
                          + Dodaj sliku
                        </button>
                      )}
                    </div>

                    {(treatment.images ?? []).map((img, ii) => {
                      const updateImg = (updated: {
                        src: string;
                        alt: string;
                      }) => {
                        const imgs = [...(treatment.images ?? [])];
                        imgs[ii] = updated;
                        updateTreatment({ ...treatment, images: imgs });
                      };
                      const removeImg = () => {
                        const imgs = (treatment.images ?? []).filter(
                          (_, idx) => idx !== ii,
                        );
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
                              onChange={(e) =>
                                updateImg({ ...img, alt: e.target.value })
                              }
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
                        images: [
                          { src: "", alt: "" },
                          { src: "", alt: "" },
                        ],
                        href: "/termini",
                      };
                      const all = [...(gallery.treatments ?? [])];
                      all.splice(ti + 1, 0, newItem);
                      updateLandingSection("gallery", {
                        ...gallery,
                        treatments: all,
                      });
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
                    images: [
                      { src: "", alt: "" },
                      { src: "", alt: "" },
                    ],
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
        tone="even"
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
          BLOG / POST
          ══════════════════════════════════════════════════════════════════ */}

      <SectionCard
        title="Blog / Novosti"
        badge="Blog"
        tone="odd"
        enabled={blog.enabled}
        onToggle={(v) => updateLandingSection("blog", { ...blog, enabled: v })}
      >
        <div className="space-y-4">
          <div>
            <label className={lbl}>Naslov sekcije</label>
            <input
              className={inp}
              value={blog.headline ?? ""}
              onChange={(e) =>
                updateLandingSection("blog", {
                  ...blog,
                  headline: e.target.value,
                })
              }
              placeholder="Novosti i Artikli"
            />
          </div>
          <div>
            <label className={lbl}>Opis (opciono)</label>
            <textarea
              className={inp}
              rows={2}
              value={blog.paragraph ?? ""}
              onChange={(e) =>
                updateLandingSection("blog", {
                  ...blog,
                  paragraph: e.target.value,
                })
              }
              placeholder="Kratki uvodni tekst ispod naslova..."
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Prikazuje se max. 3 najnovija objavljena blog artikla sa linkom
            &ldquo;Pogledaj više&rdquo;.
          </p>
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
              <div className="col-span-2">
                <div className="flex items-center justify-between">
                  <label className={lbl}>Paragraf</label>
                  <span className="mb-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                    {(servicesPage.paragraph ?? "").length}/{PAGE_PARAGRAPH_MAX}{" "}
                    characters with spaces
                  </span>
                </div>
                <textarea
                  className={inp + " resize-none"}
                  rows={4}
                  maxLength={PAGE_PARAGRAPH_MAX}
                  value={servicesPage.paragraph ?? ""}
                  onChange={(e) =>
                    updatePagesSection("servicesPage", {
                      ...servicesPage,
                      paragraph: e.target.value.slice(0, PAGE_PARAGRAPH_MAX),
                    })
                  }
                  placeholder="Jedan kratak SEO paragraf za stranicu usluga..."
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
              <div className="col-span-2">
                <div className="flex items-center justify-between">
                  <label className={lbl}>Paragraf</label>
                  <span className="mb-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                    {(appointmentsPage.paragraph ?? "").length}/
                    {PAGE_PARAGRAPH_MAX} characters with spaces
                  </span>
                </div>
                <textarea
                  className={inp + " resize-none"}
                  rows={4}
                  maxLength={PAGE_PARAGRAPH_MAX}
                  value={appointmentsPage.paragraph ?? ""}
                  onChange={(e) =>
                    updatePagesSection("appointmentsPage", {
                      ...appointmentsPage,
                      paragraph: e.target.value.slice(0, PAGE_PARAGRAPH_MAX),
                    })
                  }
                  placeholder="Jedan kratak SEO paragraf za stranicu termina..."
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
                <CtaAnchorBadges
                  onSelect={(href) =>
                    updatePagesSection("appointmentsPage", {
                      ...appointmentsPage,
                      ctas: {
                        ...appointmentsPage.ctas,
                        primary: {
                          ...appointmentsPage.ctas?.primary,
                          href,
                          text: appointmentsPage.ctas?.primary?.text ?? "",
                        },
                      },
                    })
                  }
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
                <CtaAnchorBadges
                  onSelect={(href) =>
                    updatePagesSection("appointmentsPage", {
                      ...appointmentsPage,
                      ctas: {
                        ...appointmentsPage.ctas,
                        secondary: {
                          ...appointmentsPage.ctas?.secondary,
                          href,
                          text: appointmentsPage.ctas?.secondary?.text ?? "",
                        },
                      },
                    })
                  }
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
