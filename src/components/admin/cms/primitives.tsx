"use client";

/**
 * Deljeni primitivi CMS editora.
 *
 * Izdvojeni iz `AdminLandingCMS.tsx` kada je theme-9 authoring surface dobio
 * svoj fajl: dva editora moraju da izgledaju identično, a duplirani stilski
 * tokeni se razilaze prvom izmenom. Ovde nema logike — samo klase i dva
 * omotača koje obe strane koriste.
 */

import { useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { ImageSelect } from "@/components/elements/ImageSelect";
import LoaderButton from "@/components/elements/LoaderButton";

export const inp = [
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm",
  "text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800",
  "focus:outline-none focus:ring-2 focus:ring-violet-400 transition",
  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
].join(" ");

export const lbl =
  "block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5";

export const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

export const sectionCardBase =
  "rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

export const sectionCardTone = {
  odd: "bg-white dark:bg-gray-900",
  even: "bg-gray-50 dark:bg-gray-950",
};

// ─── Toggle switch ────────────────────────────────────────────────────────────

export function ToggleSwitch({
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

export function SectionCard({
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

// ─── Image field (upload / biblioteka / AI) ──────────────────────────────────

export function ImageInputField({
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
