// app/dashboard/page.tsx
"use client";

// AuthStatusButton: shows current user + logout on admin header

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthStatusButton } from "@/components/auth/AuthStatusButton";
import { useSalonProfileAdmin } from "@/hooks/useSalonProfileAdmin";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useAdminServices } from "@/hooks/useAdminServices";
import { DAYS_OF_WEEK } from "@/types";
import type { DayOfWeek, IService, LandingTheme } from "@/types";
import { AdminCustomDomain } from "@/components/admin/AdminCustomDomain";

// ─── Types & constants ────────────────────────────────────────────────────────
type Tab = "profil" | "radno-vreme" | "social-seo" | "usluge" | "domen";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "profil", label: "Profil salona", emoji: "🏪" },
  { id: "radno-vreme", label: "Radno vreme", emoji: "🕐" },
  { id: "social-seo", label: "Social & SEO", emoji: "🌐" },
  { id: "usluge", label: "Usluge", emoji: "✂️" },
  { id: "domen", label: "Custom Domen", emoji: "🔗" },
];

// Theme thumbnails from Cloudinary /salons/landing-pages
const THEMES: {
  id: LandingTheme;
  label: string;
  description: string;
  cloudinaryUrl: string;
  previewColors: string[];
}[] = [
  {
    id: "theme-1",
    label: "Light Gradient",
    description: "Moderan, svetao dizajn sa gradijentima",
    cloudinaryUrl:
      "https://res.cloudinary.com/dufo1t5li/image/upload/v1773939380/theme-1_g3tzcf.png",
    previewColors: ["#a855f7", "#ec4899", "#fff"],
  },
  {
    id: "theme-2",
    label: "Dark Luxury",
    description: "Tamni, luksuzni dizajn sa zlatnim akcentima",
    cloudinaryUrl:
      "https://res.cloudinary.com/dufo1t5li/image/upload/v1773943663/theme-3_zqo83n.png",
    previewColors: ["#111827", "#eab308", "#374151"],
  },
  {
    id: "theme-3",
    label: "Soft Minimal",
    description: "Nežni, minimalistički dizajn u toplim tonovima",
    cloudinaryUrl:
      "https://res.cloudinary.com/dufo1t5li/image/upload/v1773940191/landing-2_fex69c.png",
    previewColors: ["#C9A990", "#FAF8F5", "#EDE5DC"],
  },
];

// ─── Style helpers ────────────────────────────────────────────────────────────
const inp =
  "w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white transition placeholder:text-zinc-400";
const lbl =
  "block text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5";
const card = "bg-white rounded-2xl border border-zinc-100 shadow-sm p-6";

function servicePrice(s: IService): string {
  if (s.type === "single")
    return s.basePrice ? `${s.basePrice.toLocaleString("sr-RS")} RSD` : "—";
  if (s.type === "variant")
    return s.variants?.[0]?.price
      ? `od ${s.variants[0].price.toLocaleString("sr-RS")} RSD`
      : "—";
  return "Paket";
}

const TYPE_BADGE: Record<string, string> = {
  single: "bg-blue-50 text-blue-600",
  variant: "bg-amber-50 text-amber-600",
  group: "bg-green-50 text-green-600",
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>("profil");
  const [confirmDeleteSalon, setConfirmDeleteSalon] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sp = useSalonProfileAdmin();
  const svc = useAdminServices();
  const tenant = useTenantAdmin();
  const hasProfile = !!sp.profile;

  // Salon website URL — derived from tenant (slug or custom domain)
  const salonUrl = tenant.getTenantUrl();

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {sp.logoPreview && (
              <Image
                src={sp.logoPreview}
                alt="logo"
                width={64}
                height={64}
                className="w-16 h-16 rounded-lg object-cover border border-zinc-200"
              />
            )}
            <div>
              <p className="text-xs font-bold text-violet-500 uppercase tracking-widest">
                Admin Panel
              </p>
              <h1 className="text-3xl font-bold text-zinc-800 leading-tight">
                {sp.profile?.name ?? "Moj salon"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Link to salon website */}
            {hasProfile && salonUrl && (
              <Link
                href={salonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-violet-200 text-violet-600 text-xs font-semibold hover:bg-violet-50 transition"
              >
                <span>🌐</span>
                <span className="hidden sm:inline">Sajt salona</span>
                <span className="sm:hidden">Sajt</span>
                <svg
                  className="w-3 h-3 opacity-60"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M2 10L10 2M10 2H4M10 2v6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </Link>
            )}

            {sp.isLoading && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="w-3.5 h-3.5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin inline-block" />
                Učitavanje...
              </span>
            )}
            <AuthStatusButton theme="light" logoutRedirect="/login" />
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex overflow-x-auto scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                tab === t.id
                  ? "border-violet-500 text-violet-700"
                  : "border-transparent text-zinc-400 hover:text-zinc-700"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* ═══ TAB: Profil ═════════════════════════════════════════════════ */}
        {tab === "profil" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logo */}
            <div
              className={
                card + " lg:col-span-1 flex flex-col items-center gap-4"
              }
            >
              <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden">
                {sp.logoPreview ? (
                  <Image
                    src={sp.logoPreview}
                    alt="Logo"
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">🏪</span>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={sp.handleLogoChange}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition"
              >
                {sp.logoPreview ? "Promeni logo" : "Dodaj logo"}
              </button>
              {sp.logoPreview && (
                <button
                  onClick={sp.removeLogo}
                  className="w-full py-2 border border-red-200 text-red-500 text-sm rounded-xl hover:bg-red-50 transition"
                >
                  Ukloni logo
                </button>
              )}
              <p className="text-[11px] text-zinc-400 text-center">
                PNG · JPG · WebP · Maks. 5 MB
              </p>

              {/* Branding */}
              <div className="w-full border-t border-zinc-100 pt-4 space-y-3">
                <p className={lbl}>Branding boje</p>
                {(["primaryColor", "secondaryColor"] as const).map((k) => (
                  <label
                    key={k}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    <input
                      type="color"
                      value={sp.form.branding[k]}
                      onChange={(e) => sp.setBrandingField(k, e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-zinc-200 p-0.5"
                    />
                    <span className="text-xs text-zinc-500">
                      {k === "primaryColor" ? "Primarna" : "Sekundarna"}
                    </span>
                  </label>
                ))}
                <div>
                  <label className={lbl + " mt-2"}>Font</label>
                  <select
                    className={inp}
                    value={sp.form.branding.fontFamily}
                    onChange={(e) =>
                      sp.setBrandingField("fontFamily", e.target.value)
                    }
                  >
                    {[
                      "Inter",
                      "Poppins",
                      "Lato",
                      "Montserrat",
                      "Playfair Display",
                      "DM Sans",
                      "Nunito",
                    ].map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Theme picker ────────────────────────────────────────── */}
              <div className="w-full border-t border-zinc-100 pt-4">
                <p className={lbl}>Tema sajta</p>
                <p className="text-[11px] text-zinc-400 mb-3">
                  Izaberite dizajn za stranicu vašeg salona
                </p>
                <div className="space-y-2">
                  {THEMES.map((theme) => {
                    const selected = sp.form.landingTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => sp.setField("landingTheme", theme.id)}
                        className={`w-full text-left rounded-xl border-2 p-3 transition-all ${
                          selected
                            ? "border-violet-500 bg-violet-50"
                            : "border-zinc-100 hover:border-zinc-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Color preview swatch */}
                          <div className="flex-shrink-0 w-14 h-10 rounded-lg overflow-hidden border border-zinc-200 flex">
                            {theme.previewColors.map((c, i) => (
                              <div
                                key={i}
                                className="flex-1"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-700">
                                {theme.label}
                              </span>
                              {selected && (
                                <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full">
                                  Aktivna
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                              {theme.description}
                            </p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                              selected
                                ? "border-violet-500 bg-violet-500"
                                : "border-zinc-300"
                            }`}
                          >
                            {selected && (
                              <svg
                                className="w-full h-full text-white p-0.5"
                                viewBox="0 0 12 12"
                                fill="none"
                              >
                                <path
                                  d="M2 6l3 3 5-5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Save button when not in edit mode (for logo / theme / branding changes) */}
              {hasProfile && !sp.isEditing && (
                <div className="mt-6 pt-4 border-t border-zinc-100">
                  <button
                    onClick={() => sp.save()}
                    disabled={sp.isSaving}
                    className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
                  >
                    {sp.isSaving ? "Snimanje..." : "Sačuvaj temu i logo"}
                  </button>
                </div>
              )}
            </div>

            {/* Osnovni podaci */}
            <div className={card + " lg:col-span-2"}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-zinc-800">Osnovni podaci</h2>
                {hasProfile && !sp.isEditing && (
                  <button
                    onClick={sp.startEdit}
                    className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition"
                  >
                    ✏️ Izmeni
                  </button>
                )}
              </div>

              {/* View mode */}
              {hasProfile && !sp.isEditing ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    ["Naziv salona", sp.profile!.name],
                    ["Email", sp.profile!.email],
                    ["Telefon", sp.profile!.phone || "—"],
                    ["Grad", sp.profile!.city || "—"],
                    ["Adresa", sp.profile!.street || "—"],
                    ["Newsletter email", sp.profile!.newsletterEmail || "—"],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                        {l}
                      </p>
                      <p className="text-sm text-zinc-800 mt-1">{v}</p>
                    </div>
                  ))}
                  {sp.profile!.description && (
                    <div className="col-span-2">
                      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                        Opis
                      </p>
                      <p className="text-sm text-zinc-700 mt-1 leading-relaxed">
                        {sp.profile!.description}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className={lbl}>Naziv salona *</label>
                      <input
                        className={inp}
                        value={sp.form.name}
                        onChange={(e) => sp.setField("name", e.target.value)}
                        placeholder="Nail Studio Anja"
                      />
                    </div>
                    <div>
                      <label className={lbl}>Email</label>
                      <input
                        className={inp + " opacity-60 cursor-not-allowed"}
                        value={sp.form.email}
                        readOnly
                        title="Email se ne može menjati"
                      />
                    </div>
                    <div>
                      <label className={lbl}>Telefon *</label>
                      <input
                        className={inp}
                        value={sp.form.phone}
                        onChange={(e) => sp.setField("phone", e.target.value)}
                        placeholder="+381 60 123 4567"
                      />
                    </div>
                    <div>
                      <label className={lbl}>Grad</label>
                      <input
                        className={inp}
                        value={sp.form.city}
                        onChange={(e) => sp.setField("city", e.target.value)}
                        placeholder="Beograd"
                      />
                    </div>
                    <div>
                      <label className={lbl}>Ulica i broj</label>
                      <input
                        className={inp}
                        value={sp.form.street}
                        onChange={(e) => sp.setField("street", e.target.value)}
                        placeholder="Knez Mihailova 1"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={lbl}>Newsletter email</label>
                      <input
                        className={inp}
                        value={sp.form.newsletterEmail}
                        onChange={(e) =>
                          sp.setField("newsletterEmail", e.target.value)
                        }
                        placeholder="newsletter@salon.com"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={lbl}>Opis salona</label>
                      <textarea
                        className={inp + " resize-none"}
                        rows={3}
                        value={sp.form.description}
                        onChange={(e) =>
                          sp.setField("description", e.target.value)
                        }
                        placeholder="Kratki opis vašeg salona koji klijenti vide na sajtu..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => sp.save()}
                      disabled={sp.isSaving}
                      className="px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
                    >
                      {sp.isSaving
                        ? "Snimanje..."
                        : hasProfile
                          ? "Sačuvaj izmene"
                          : "Kreiraj salon"}
                    </button>
                    {hasProfile && (
                      <button
                        onClick={sp.cancelEdit}
                        className="text-sm text-zinc-400 hover:text-zinc-600 px-3"
                      >
                        Otkaži
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Delete zone */}
            {hasProfile && (
              <div className="lg:col-span-3 rounded-2xl border border-red-100 bg-red-50/40 p-5">
                <p className="text-sm font-bold text-red-700 mb-1">
                  Opasna zona
                </p>
                <p className="text-xs text-red-500 mb-4">
                  Brisanje salona je nepovratno — svi podaci će biti trajno
                  uklonjeni.
                </p>
                {confirmDeleteSalon ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        sp.deleteProfile();
                        setConfirmDeleteSalon(false);
                      }}
                      disabled={sp.isDeleting}
                      className="px-5 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition"
                    >
                      {sp.isDeleting ? "Brisanje..." : "Da, obriši salon"}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteSalon(false)}
                      className="text-sm text-zinc-400 hover:text-zinc-600"
                    >
                      Odustani
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteSalon(true)}
                    className="px-5 py-2 border border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition"
                  >
                    Obriši salon
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: Radno vreme ════════════════════════════════════════════ */}
        {tab === "radno-vreme" && (
          <div className={card}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-zinc-800">Radno vreme</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Prazan dan = neradan dan. Klik + dodaj smenu za više slotova.
                </p>
              </div>
              <button
                onClick={() => sp.save()}
                disabled={sp.isSaving}
                className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
              >
                {sp.isSaving ? "Snimanje..." : "Sačuvaj"}
              </button>
            </div>
            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day: DayOfWeek) => {
                const slots = sp.form.workingHours[day] ?? [];
                const isRest = slots.length === 0;
                return (
                  <div
                    key={day}
                    className={`rounded-2xl border p-4 transition-colors ${isRest ? "bg-zinc-50 border-zinc-100" : "bg-violet-50/40 border-violet-100"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-[108px] flex-shrink-0 text-sm font-bold text-zinc-700">
                          {day}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${isRest ? "bg-zinc-200 text-zinc-500" : "bg-violet-200 text-violet-700"}`}
                        >
                          {isRest ? "Neradan" : `${slots.length} smena`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => sp.addTimeSlot(day)}
                          className="text-xs font-bold text-violet-600 bg-violet-100 hover:bg-violet-200 px-3 py-1.5 rounded-lg transition"
                        >
                          + Smena
                        </button>
                        {!isRest && (
                          <button
                            onClick={() => sp.clearDay(day)}
                            className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1.5 hover:bg-red-50 rounded-lg transition"
                          >
                            Obriši
                          </button>
                        )}
                      </div>
                    </div>
                    {slots.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {slots.map((slot, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400 w-4 text-right">
                              {idx + 1}.
                            </span>
                            <div className="flex items-center gap-2 bg-white rounded-xl border border-zinc-200 px-3 py-1.5 flex-1">
                              <span className="text-xs text-zinc-400 font-medium">
                                od
                              </span>
                              <input
                                type="time"
                                value={slot.from}
                                onChange={(e) =>
                                  sp.updateTimeSlot(
                                    day,
                                    idx,
                                    "from",
                                    e.target.value,
                                  )
                                }
                                className="text-sm font-semibold text-zinc-800 bg-transparent focus:outline-none w-auto"
                              />
                              <span className="text-zinc-300">|</span>
                              <span className="text-xs text-zinc-400 font-medium">
                                do
                              </span>
                              <input
                                type="time"
                                value={slot.to}
                                onChange={(e) =>
                                  sp.updateTimeSlot(
                                    day,
                                    idx,
                                    "to",
                                    e.target.value,
                                  )
                                }
                                className="text-sm font-semibold text-zinc-800 bg-transparent focus:outline-none w-auto"
                              />
                            </div>
                            <button
                              onClick={() => sp.removeTimeSlot(day, idx)}
                              className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition text-lg"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ TAB: Social & SEO ═══════════════════════════════════════════ */}
        {tab === "social-seo" && (
          <div className="space-y-6">
            <div className={card}>
              <h2 className="font-bold text-zinc-800 mb-5">Društvene mreže</h2>
              <div className="space-y-3">
                {(["instagram", "facebook", "tiktok"] as const).map((net) => (
                  <div key={net} className="flex items-center gap-4">
                    <span className="w-24 text-sm font-semibold text-zinc-600 capitalize">
                      {net}
                    </span>
                    <input
                      className={inp}
                      value={sp.form.social[net] ?? ""}
                      onChange={(e) => sp.setSocialField(net, e.target.value)}
                      placeholder={`https://${net}.com/vašsalon`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => sp.save()}
                  disabled={sp.isSaving}
                  className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
                >
                  {sp.isSaving ? "Snimanje..." : "Sačuvaj"}
                </button>
              </div>
            </div>

            <div className={card}>
              <h2 className="font-bold text-zinc-800 mb-1">SEO Metadata</h2>
              <p className="text-xs text-zinc-400 mb-5">
                Title i description koji se prikazuju u Google pretrazi.
              </p>
              <div className="space-y-5">
                {(
                  [
                    { page: "Početna", tk: "homeTitle", dk: "homeDescription" },
                    {
                      page: "Usluge",
                      tk: "uslugeTitle",
                      dk: "uslugeDescription",
                    },
                    {
                      page: "Termini",
                      tk: "terminiTitle",
                      dk: "terminiDescription",
                    },
                  ] as const
                ).map(({ page, tk, dk }) => (
                  <div
                    key={page}
                    className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 space-y-3"
                  >
                    <span className="text-xs font-bold text-violet-600 bg-violet-100 px-2.5 py-1 rounded-lg">
                      {page}
                    </span>
                    <div>
                      <label className={lbl}>
                        Title{" "}
                        <span className="font-normal normal-case text-zinc-300">
                          · max 60
                        </span>
                      </label>
                      <input
                        className={inp}
                        value={sp.form.seo[tk] ?? ""}
                        onChange={(e) => sp.setSeoField(tk, e.target.value)}
                        placeholder={`${page} – naziv salona`}
                        maxLength={60}
                      />
                      <p className="text-[11px] text-right mt-1 text-zinc-400">
                        {(sp.form.seo[tk] ?? "").length}/60
                      </p>
                    </div>
                    <div>
                      <label className={lbl}>
                        Description{" "}
                        <span className="font-normal normal-case text-zinc-300">
                          · max 160
                        </span>
                      </label>
                      <textarea
                        className={inp + " resize-none"}
                        rows={2}
                        value={sp.form.seo[dk] ?? ""}
                        onChange={(e) => sp.setSeoField(dk, e.target.value)}
                        placeholder="Kratki opis stranice..."
                        maxLength={160}
                      />
                      <p className="text-[11px] text-right mt-1 text-zinc-400">
                        {(sp.form.seo[dk] ?? "").length}/160
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => sp.save()}
                  disabled={sp.isSaving}
                  className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
                >
                  {sp.isSaving ? "Snimanje..." : "Sačuvaj SEO"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: Usluge ════════════════════════════════════════════════ */}
        {tab === "usluge" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-zinc-800">Usluge</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {svc.services.length} ukupno
                </p>
              </div>
              <button
                onClick={svc.openCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition shadow-sm shadow-violet-200"
              >
                + Dodaj uslugu
              </button>
            </div>

            {svc.isLoading && (
              <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 py-16">
                <span className="w-5 h-5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin inline-block" />
                Učitavanje usluga...
              </div>
            )}

            {!svc.isLoading && svc.services.length === 0 && (
              <div className={card + " text-center py-16"}>
                <div className="text-5xl mb-4">✂️</div>
                <p className="font-semibold text-zinc-700 mb-1">Nema usluga</p>
                <p className="text-sm text-zinc-400 mb-6">
                  Dodajte prvu uslugu i ona će se prikazati klijentima.
                </p>
                <button
                  onClick={svc.openCreate}
                  className="px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition"
                >
                  + Dodaj prvu uslugu
                </button>
              </div>
            )}

            {!svc.isLoading &&
              svc.services.length > 0 &&
              (() => {
                const grouped = svc.services.reduce<Record<string, IService[]>>(
                  (acc, s) => {
                    const c = s.category || "Ostalo";
                    if (!acc[c]) acc[c] = [];
                    acc[c].push(s);
                    return acc;
                  },
                  {},
                );

                return Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold text-violet-600 uppercase tracking-widest">
                        {cat}
                      </span>
                      <span className="text-xs text-zinc-300">
                        {items.length}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-zinc-100 overflow-hidden">
                      {items.map((srv, i) => (
                        <div
                          key={srv._id}
                          className={`flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 transition group ${i > 0 ? "border-t border-zinc-100" : ""}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-zinc-800 truncate">
                                {srv.name}
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${TYPE_BADGE[srv.type] ?? "bg-zinc-100 text-zinc-500"}`}
                              >
                                {srv.type}
                              </span>
                              {srv.featured && srv.featured !== "none" && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
                                  ★ {srv.featured}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-zinc-500 font-medium">
                                {servicePrice(srv)}
                              </span>
                              {srv.duration && (
                                <span className="text-xs text-zinc-400">
                                  ⏱ {srv.duration} min
                                </span>
                              )}
                              {srv.subcategory && (
                                <span className="text-xs text-zinc-400">
                                  {srv.subcategory}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => svc.openEdit(srv)}
                              className="p-2 text-zinc-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition text-sm"
                              title="Izmeni"
                            >
                              ✏️
                            </button>
                            {svc.deleteConfirmId === srv._id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => svc.confirmDelete(srv._id)}
                                  disabled={svc.isDeleting}
                                  className="px-2.5 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg"
                                >
                                  {svc.isDeleting ? "..." : "Obriši"}
                                </button>
                                <button
                                  onClick={() => svc.setDeleteConfirmId(null)}
                                  className="px-2 py-1.5 text-zinc-400 text-xs hover:text-zinc-600"
                                >
                                  Odustani
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => svc.setDeleteConfirmId(srv._id)}
                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition text-sm"
                                title="Obriši"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
          </div>
        )}

        {/* ═══ TAB: Custom Domen ══════════════════════════════════════════ */}
        {tab === "domen" && <AdminCustomDomain />}
      </main>

      {/* ── Service Modal ─────────────────────────────────────────────────── */}
      {svc.modalMode !== "closed" && <ServiceModal s={svc} />}
    </div>
  );
}

// ─── Service Modal ────────────────────────────────────────────────────────────
function ServiceModal({ s }: { s: ReturnType<typeof useAdminServices> }) {
  const { form } = s;
  const isEdit = s.modalMode === "edit";
  const i2 =
    "w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white transition placeholder:text-zinc-400";
  const l2 =
    "block text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5";

  const categories = s
    ? Array.from(new Set(s.services.map((s) => s.category)))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <div>
            <h2 className="font-bold text-zinc-800">
              {isEdit ? "Izmeni uslugu" : "Dodaj novu uslugu"}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isEdit
                ? `Uređivanje: ${s.editingService?.name}`
                : "Popunite podatke o usluzi"}
            </p>
          </div>
          <button
            onClick={s.closeModal}
            className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl text-xl transition"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={l2}>Naziv usluge *</label>
              <input
                className={i2}
                value={form.name}
                onChange={(e) => s.setField("name", e.target.value)}
                placeholder="npr. Gel lak — ceo set"
              />
            </div>
            {/* SELECT EXISTING CATEGORY */}
            {categories.length > 0 && (
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Postojeće kategorije
                </label>
                <select
                  value={form.category}
                  onChange={(e) => s.setField("category", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-200 bg-gray-100 p-2"
                >
                  <option value="">-- izaberi --</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={l2}>Kategorija *</label>
              <input
                className={i2}
                value={form.category}
                onChange={(e) => s.setField("category", e.target.value)}
                placeholder="Nokti, Šminkanje..."
              />
            </div>
            <div>
              <label className={l2}>Podkategorija</label>
              <input
                className={i2}
                value={form.subcategory ?? ""}
                onChange={(e) => s.setField("subcategory", e.target.value)}
                placeholder="Gel, Akril..."
              />
            </div>
            <div>
              <label className={l2}>Tip *</label>
              <select
                className={i2}
                value={form.type}
                onChange={(e) =>
                  s.setField(
                    "type",
                    e.target.value as "single" | "group" | "variant",
                  )
                }
              >
                <option value="single">Single — jedna cena</option>
                <option value="variant">Variant — više varijanti</option>
                <option value="group">Group — paket usluga</option>
              </select>
            </div>
            <div>
              <label className={l2}>Istaknuta pozicija</label>
              <select
                className={i2}
                value={form.featured ?? "none"}
                onChange={(e) =>
                  s.setField(
                    "featured",
                    e.target.value as "main" | "second" | "third" | "none",
                  )
                }
              >
                <option value="none">Nije istaknuta</option>
                <option value="main">⭐ Glavna</option>
                <option value="second">Druga</option>
                <option value="third">Treća</option>
              </select>
            </div>
          </div>

          {form.type === "single" && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <div>
                <label className={l2}>Cena (RSD) *</label>
                <input
                  type="number"
                  className={i2}
                  value={form.basePrice ?? ""}
                  onChange={(e) =>
                    s.setField(
                      "basePrice",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  placeholder="2000"
                  min={0}
                />
              </div>
              <div>
                <label className={l2}>Trajanje (min) *</label>
                <input
                  type="number"
                  className={i2}
                  value={form.duration ?? ""}
                  onChange={(e) =>
                    s.setField(
                      "duration",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  placeholder="60"
                  min={5}
                />
              </div>
            </div>
          )}

          {form.type === "variant" && (
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className={l2 + " mb-0"}>Varijante</span>
                <button
                  onClick={s.addVariant}
                  className="text-xs font-bold text-violet-600 hover:text-violet-800 bg-violet-100 hover:bg-violet-200 px-3 py-1.5 rounded-lg transition"
                >
                  + Dodaj
                </button>
              </div>
              {(form.variants ?? []).length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-2">
                  Dodajte najmanje jednu varijantu.
                </p>
              )}
              {(form.variants ?? []).map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={i2 + " flex-1"}
                    value={v.name}
                    onChange={(e) => s.updateVariant(i, "name", e.target.value)}
                    placeholder="Naziv"
                  />
                  <input
                    type="number"
                    className={i2 + " w-28"}
                    value={v.price || ""}
                    onChange={(e) =>
                      s.updateVariant(i, "price", Number(e.target.value))
                    }
                    placeholder="RSD"
                    min={0}
                  />
                  <input
                    type="number"
                    className={i2 + " w-20"}
                    value={v.duration || ""}
                    onChange={(e) =>
                      s.updateVariant(i, "duration", Number(e.target.value))
                    }
                    placeholder="Min"
                    min={1}
                  />
                  <button
                    onClick={() => s.removeVariant(i)}
                    className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition text-xl"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {form.type === "group" && (
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className={l2 + " mb-0"}>Usluge u paketu</span>
                <button
                  onClick={s.addGroupService}
                  className="text-xs font-bold text-violet-600 hover:text-violet-800 bg-violet-100 hover:bg-violet-200 px-3 py-1.5 rounded-lg transition"
                >
                  + Dodaj
                </button>
              </div>
              {(form.services ?? []).map((sv, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={i2 + " flex-1"}
                    value={sv.name}
                    onChange={(e) =>
                      s.updateGroupService(i, "name", e.target.value)
                    }
                    placeholder="Naziv"
                  />
                  <input
                    type="number"
                    className={i2 + " w-28"}
                    value={sv.price || ""}
                    onChange={(e) =>
                      s.updateGroupService(i, "price", Number(e.target.value))
                    }
                    placeholder="RSD"
                    min={0}
                  />
                  <input
                    type="number"
                    className={i2 + " w-20"}
                    value={sv.duration || ""}
                    onChange={(e) =>
                      s.updateGroupService(
                        i,
                        "duration",
                        Number(e.target.value),
                      )
                    }
                    placeholder="Min"
                    min={1}
                  />
                  <button
                    onClick={() => s.removeGroupService(i)}
                    className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition text-xl"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {(form.type === "variant" || form.type === "group") && (
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className={l2 + " mb-0"}>Dodaci (opcioni)</span>
                <button
                  onClick={s.addExtra}
                  className="text-xs font-bold text-zinc-500 hover:text-zinc-700 bg-zinc-200 hover:bg-zinc-300 px-3 py-1.5 rounded-lg transition"
                >
                  + Dodaj
                </button>
              </div>
              {(form.extras ?? []).map((ex, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={i2 + " flex-1"}
                    value={ex.name}
                    onChange={(e) => s.updateExtra(i, "name", e.target.value)}
                    placeholder="Naziv dodatka"
                  />
                  <input
                    type="number"
                    className={i2 + " w-28"}
                    value={ex.price || ""}
                    onChange={(e) =>
                      s.updateExtra(i, "price", Number(e.target.value))
                    }
                    placeholder="RSD"
                    min={0}
                  />
                  <input
                    type="number"
                    className={i2 + " w-20"}
                    value={ex.duration || ""}
                    onChange={(e) =>
                      s.updateExtra(i, "duration", Number(e.target.value))
                    }
                    placeholder="Min"
                    min={0}
                  />
                  <button
                    onClick={() => s.removeExtra(i)}
                    className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition text-xl"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className={l2}>Opis usluge</label>
            <textarea
              className={i2 + " resize-none"}
              rows={3}
              value={form.description}
              onChange={(e) => s.setField("description", e.target.value)}
              placeholder="Šta je uključeno, napomene za klijente..."
            />
          </div>

          <div className="rounded-2xl border border-zinc-100 p-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${form.subscription.enabled ? "bg-violet-500" : "bg-zinc-200"}`}
                onClick={() =>
                  s.setSubscriptionField("enabled", !form.subscription.enabled)
                }
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${form.subscription.enabled ? "translate-x-5" : "translate-x-1"}`}
                />
              </div>
              <span className="text-sm font-semibold text-zinc-700">
                Pretplata za ovu uslugu
              </span>
            </label>
            {form.subscription.enabled && (
              <div className="mt-4">
                <label className={l2}>Mesečna cena (RSD)</label>
                <input
                  type="number"
                  className={i2}
                  value={form.subscription.priceMonthly ?? ""}
                  onChange={(e) =>
                    s.setSubscriptionField(
                      "priceMonthly",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  placeholder="5000"
                  min={0}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100">
          <button
            onClick={s.closeModal}
            className="px-4 py-2.5 text-sm text-zinc-500 hover:text-zinc-700 font-medium"
          >
            Odustani
          </button>
          <button
            onClick={() => s.save()}
            disabled={s.isSaving}
            className="px-7 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50 shadow-sm shadow-violet-200"
          >
            {s.isSaving
              ? "Snimanje..."
              : isEdit
                ? "Sačuvaj izmene"
                : "Dodaj uslugu"}
          </button>
        </div>
      </div>
    </div>
  );
}
