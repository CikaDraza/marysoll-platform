// app/dashboard/page.tsx
"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import { useSalonProfileAdmin } from "@/hooks/useSalonProfileAdmin";
import { useAdminServices } from "@/hooks/useAdminServices";
import { DAYS_OF_WEEK } from "@/types";
import type { DayOfWeek, IService, LandingTheme } from "@/types";
import { AdminCustomDomain } from "@/components/admin/AdminCustomDomain";
import AdminAppointments from "@/components/admin/AdminAppointments";
import AdminTestimonials from "@/components/admin/AdminTestimonials";
import AppointmentAdminCalendar from "@/components/admin/AppointmentAdminCalendar";
import { StatisticsPage } from "@/components/admin/statistics/StatisticPage";
import AdminNewsletterDashboard from "@/components/admin/AdminNewsletterDashboard";
import { EmailCampaignAIGenerator } from "@/components/email-campaign/EmailCampaignAIGenerator";
import { AdminLandingCMS } from "@/components/admin/cms/AdminLandingCMS";
import { AdminChat } from "@/components/admin/chat/AdminChat";
import ClientsList from "@/components/admin/ClientsList";
import { ServiceModal } from "@/components/admin/ServiceModal";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import DashboardLayout from "@/layout/DashboardLayout";
import Loader from "@/components/elements/Loader";
import { api } from "@/lib/api";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab =
  | "profil"
  | "radno-vreme"
  | "social-seo"
  | "cms"
  | "usluge"
  | "termini"
  | "kalendar"
  | "statistika"
  | "newsletter"
  | "email-campaign-ai"
  | "preporuke"
  | "domen"
  | "klijenti"
  | "chat";

const ALL_TABS: Tab[] = [
  "profil",
  "radno-vreme",
  "social-seo",
  "cms",
  "usluge",
  "termini",
  "kalendar",
  "statistika",
  "newsletter",
  "email-campaign-ai",
  "preporuke",
  "domen",
  "klijenti",
  "chat",
];

// ─── Themes ───────────────────────────────────────────────────────────────────

const THEMES: {
  id: LandingTheme;
  label: string;
  description: string;
  previewColors: string[];
}[] = [
  {
    id: "theme-1",
    label: "Makeup Theme",
    description: "Čist, elegantan dizajn u beloj i sivoj sa crnim akcentima",
    previewColors: ["#ffffff", "#e5e7eb", "#111111"],
  },
  {
    id: "theme-2",
    label: "Dark Luxury",
    description: "Tamni, luksuzni dizajn sa zlatnim akcentima",
    previewColors: ["#111827", "#eab308", "#374151"],
  },
  {
    id: "theme-3",
    label: "Soft Minimal",
    description: "Nežni, minimalistički dizajn u toplim tonovima",
    previewColors: ["#C9A990", "#FAF8F5", "#EDE5DC"],
  },
  {
    id: "theme-4",
    label: "Editorial Luxury",
    description:
      "Elegantni dizajn sa jakim kontrastom i sofisticiranim fontovima",
    previewColors: ["#4C2D4A", "#2C1E29", "#E8D4AD"],
  },
  {
    id: "theme-5",
    label: "Makeup Luxury",
    description: "Elegantni dizajn sa blog postom",
    previewColors: ["#FFFFFF", "#F3F3F3", "#DCAB28"],
  },
  {
    id: "theme-6",
    label: "Nail Art Elegance",
    description: "Svetli, editorijalni dizajn za nail studio",
    previewColors: ["#FFFFFF", "#FAF8F5", "#C4A595"],
  },
];

// ─── Style tokens ─────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  single: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  variant:
    "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  group: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400",
};

// ─── Main ─────────────────────────────────────────────────────────────────────

function AdminDashboard() {
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(
    tabParam && ALL_TABS.includes(tabParam) ? tabParam : "profil",
  );

  useEffect(() => {
    async function handleSetTab() {
      const t = searchParams.get("tab") as Tab | null;
      if (t && ALL_TABS.includes(t)) setTab(t);
    }
    handleSetTab();
  }, [searchParams]);

  const [confirmDeleteSalon, setConfirmDeleteSalon] = useState(false);
  const [deleteSalonInput, setDeleteSalonInput] = useState("");
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteAccountInput, setDeleteAccountInput] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  // All hooks before early return
  const { user, token, logout, isLoading: authLoading } = useAuth();

  // Change password state
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  const { tenant, updateIdentity, isUpdatingIdentity } = useTenantAdmin();
  const isOwner = user?.globalRole === "OWNER";
  const [identityOpen, setIdentityOpen] = useState(false);
  const [identityForm, setIdentityForm] = useState({
    slug: "",
    cloudinaryFolder: "",
  });

  useEffect(() => {
    async function fetchTenant() {
      if (tenant) {
        setIdentityForm({
          slug: tenant.slug ?? "",
          cloudinaryFolder: tenant.cloudinaryFolder ?? "",
        });
      }
    }
    fetchTenant();
  }, [tenant]);

  function handleSaveWithAccount() {
    sp.save();
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("Nove lozinke se ne poklapaju.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError("Nova lozinka mora imati najmanje 8 karaktera.");
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      alert("Lozinka uspešno promenjena.");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Greška pri promeni lozinke.";
      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  }
  async function handleDeleteAccount() {
    if (!token) return;
    setIsDeletingAccount(true);
    try {
      const res = await fetch("/api/tenant-auth/delete-account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Greška pri brisanju naloga");
      }
      logout();
      router.push("/login");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Greška pri brisanju naloga");
    } finally {
      setIsDeletingAccount(false);
    }
  }

  const sp = useSalonProfileAdmin();
  const svc = useAdminServices();
  const { hasFeature } = usePlanFeatures();
  const hasProfile = !!sp.profile;

  useEffect(() => {
    if (!authLoading && (!user || (!user.isAdmin && !user.isSuperAdmin))) {
      window.location.replace("/login");
    }
  }, [authLoading, user]);

  if (authLoading || !user || (!user.isAdmin && !user.isSuperAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white font-black text-lg shadow-lg">
            M
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
            Provera pristupa...
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-5">
          {sp.logoPreview && (
            <Image
              src={sp.logoPreview}
              alt="logo"
              width={64}
              height={64}
              className="w-16 h-16 rounded-xl object-contain border border-gray-200 dark:border-gray-700"
            />
          )}
          <div>
            <p className="text-[11px] font-bold text-violet-500 uppercase tracking-widest">
              Admin Panel
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {sp.profile?.name ?? "Moj salon"}
            </h1>
          </div>
          {sp.isLoading && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-3.5 h-3.5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
              Učitavanje...
            </div>
          )}
        </div>
      </div>

      {/* ═══ TAB: Profil ════════════════════════════════════════════ */}
      {tab === "profil" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logo + branding */}
            <div
              className={
                card + " lg:col-span-1 flex flex-col items-center gap-4"
              }
            >
              <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
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
                  className="w-full py-2 border border-red-200 dark:border-red-800 text-red-500 text-sm rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  Ukloni logo
                </button>
              )}
              <p className="text-[11px] text-gray-400 text-center">
                PNG · JPG · WebP · Maks. 5 MB
              </p>

              {/* Branding colors */}
              <div className="w-full border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
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
                      className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-700 p-0.5"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
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

              {/* Theme picker */}
              <div className="w-full border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className={lbl}>Tema sajta</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
                  Izaberite dizajn za stranicu vašeg salona
                </p>
                <div className="space-y-2">
                  {THEMES.map((theme) => {
                    const selected = sp.form.landingTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => sp.setField("landingTheme", theme.id)}
                        className={[
                          "w-full text-left rounded-xl border-2 p-3 transition-all",
                          selected
                            ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                            : "border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-14 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex">
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
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                {theme.label}
                              </span>
                              {selected && (
                                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded-full">
                                  Aktivna
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                              {theme.description}
                            </p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selected ? "border-violet-500 bg-violet-500" : "border-gray-300 dark:border-gray-600"}`}
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

              {hasProfile && !sp.isEditing && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 w-full">
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
                <h2 className="font-bold text-gray-900 dark:text-white">
                  Osnovni podaci
                </h2>
                {hasProfile && !sp.isEditing && (
                  <button
                    onClick={sp.startEdit}
                    className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition"
                  >
                    ✏️ Izmeni
                  </button>
                )}
              </div>
              {hasProfile && !sp.isEditing ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    ["Naziv salona", sp.profile!.name],
                    ["Email", sp.profile!.email],
                    ["Telefon", sp.profile!.phone || "—"],
                    ["Grad", sp.profile!.city || "—"],
                    ["Adresa", sp.profile!.street || "—"],
                    ["Newsletter email", sp.profile!.newsletterEmail || "—"],
                    ["Kontakt email", sp.profile!.contactEmail || "—"],
                    ["Marketing telefon", sp.profile!.marketingPhone || "—"],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        {l}
                      </p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">
                        {v}
                      </p>
                    </div>
                  ))}
                  {sp.profile!.description && (
                    <div className="col-span-2">
                      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        Opis
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
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
                    <div>
                      <label className={lbl}>Kontakt email</label>
                      <input
                        type="email"
                        className={inp}
                        value={sp.form.contactEmail}
                        onChange={(e) =>
                          sp.setField("contactEmail", e.target.value)
                        }
                        placeholder="kontakt@salon.com"
                      />
                    </div>
                    <div>
                      <label className={lbl}>Marketing telefon</label>
                      <input
                        type="tel"
                        className={inp}
                        value={sp.form.marketingPhone}
                        onChange={(e) =>
                          sp.setField("marketingPhone", e.target.value)
                        }
                        placeholder="+381 60 000 0001"
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
                    {user?.globalRole === "OWNER" && (
                      <div className="col-span-2">
                        <label className={lbl}>Resend API ključ</label>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">
                          Vaš sopstveni Resend API ključ (Full Access) za slanje
                          emailova sa vašeg domena.
                        </p>
                        <input
                          type="password"
                          className={inp + " font-mono"}
                          value={
                            (sp.form as { resendApiKey?: string })
                              .resendApiKey ?? ""
                          }
                          onChange={(e) =>
                            sp.setField("resendApiKey", e.target.value)
                          }
                          placeholder="re_••••••••••••••••"
                          autoComplete="off"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleSaveWithAccount}
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
                        className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-3"
                      >
                        Otkaži
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* Change password */}
              <div className={card + " lg:col-span-3 mt-8"}>
                <h2 className="font-bold text-gray-900 dark:text-white mb-5">
                  Promena lozinke
                </h2>
                <form
                  onSubmit={handlePasswordChange}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl"
                >
                  <div>
                    <label className={lbl}>Trenutna lozinka</label>
                    <input
                      type="password"
                      className={inp}
                      value={pwForm.currentPassword}
                      onChange={(e) =>
                        setPwForm((p) => ({
                          ...p,
                          currentPassword: e.target.value,
                        }))
                      }
                      autoComplete="current-password"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className={lbl}>Nova lozinka</label>
                    <input
                      type="password"
                      className={inp}
                      value={pwForm.newPassword}
                      onChange={(e) =>
                        setPwForm((p) => ({
                          ...p,
                          newPassword: e.target.value,
                        }))
                      }
                      autoComplete="new-password"
                      placeholder="Najmanje 8 karaktera"
                    />
                  </div>
                  <div>
                    <label className={lbl}>Potvrdite novu lozinku</label>
                    <input
                      type="password"
                      className={inp}
                      value={pwForm.confirmPassword}
                      onChange={(e) =>
                        setPwForm((p) => ({
                          ...p,
                          confirmPassword: e.target.value,
                        }))
                      }
                      autoComplete="new-password"
                      placeholder="••••••••"
                    />
                    {pwForm.confirmPassword &&
                      pwForm.newPassword !== pwForm.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1">
                          Lozinke se ne poklapaju.
                        </p>
                      )}
                  </div>
                  {pwError && (
                    <p className="sm:col-span-3 text-red-500 text-xs">
                      {pwError}
                    </p>
                  )}
                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
                    >
                      {pwLoading ? "Menjam lozinku..." : "Promeni lozinku"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Tehnička podešavanja — OWNER only */}
              {isOwner && (
                <div className={card + " lg:col-span-3 mt-8"}>
                  <button
                    type="button"
                    onClick={() => setIdentityOpen((o) => !o)}
                    className="flex items-center gap-2 font-bold text-gray-900 dark:text-white w-full text-left"
                  >
                    Tehnička podešavanja
                    {identityOpen ? (
                      <ChevronUpIcon className="size-4 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="size-4 text-gray-400" />
                    )}
                  </button>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Slug određuje URL salona (
                    {tenant?.slug
                      ? `${tenant.slug}.marysoll.com`
                      : "slug.marysoll.com"}
                    ). Promena sluga šalje obaveštenje superadminu.
                  </p>
                  {identityOpen && (
                    <div className="mt-6 space-y-5 max-w-xl">
                      <div>
                        <label className={lbl}>Slug</label>
                        <p className="text-[11px] text-gray-400 mb-1">
                          Samo mala slova, brojevi i crtice. Automatski ažurira
                          subdomen.
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={identityForm.slug}
                            onChange={(e) =>
                              setIdentityForm((f) => ({
                                ...f,
                                slug: e.target.value,
                              }))
                            }
                            placeholder="ime-salona"
                            className={inp + " font-mono"}
                          />
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            .marysoll.com
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className={lbl}>Cloudinary folder</label>
                        <p className="text-[11px] text-gray-400 mb-1">
                          Putanja do foldera sa slikama (npr. salons/salon-ime).
                        </p>
                        <input
                          type="text"
                          value={identityForm.cloudinaryFolder}
                          onChange={(e) =>
                            setIdentityForm((f) => ({
                              ...f,
                              cloudinaryFolder: e.target.value,
                            }))
                          }
                          placeholder="salons/salon-ime"
                          className={inp + " font-mono"}
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={isUpdatingIdentity}
                          onClick={() =>
                            updateIdentity({
                              slug: identityForm.slug,
                              cloudinaryFolder: identityForm.cloudinaryFolder,
                            })
                          }
                          className="px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
                        >
                          {isUpdatingIdentity
                            ? "Čuvam..."
                            : "Sačuvaj tehničke podatke"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Danger zone */}
            <div className="lg:col-span-3 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-900/10 p-5 space-y-6">
              <p className="text-sm font-bold text-red-700 dark:text-red-400">
                Opasna zona
              </p>

              {/* ── Delete salon ── */}
              {hasProfile && (
                <div className="border-b border-red-100 dark:border-red-900/30 pb-5">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-0.5">
                    Obriši salon
                  </p>
                  <p className="text-xs text-red-500 dark:text-red-400/70 mb-3">
                    Briše profil salona. Vaš nalog ostaje aktivan — salon možete
                    ponovo kreirati.
                  </p>
                  {confirmDeleteSalon ? (
                    <div className="space-y-3">
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Upišite naziv salona{" "}
                        <span className="font-bold">
                          &quot;{sp.profile?.name}&quot;
                        </span>{" "}
                        da biste potvrdili:
                      </p>
                      <input
                        type="text"
                        value={deleteSalonInput}
                        onChange={(e) => setDeleteSalonInput(e.target.value)}
                        placeholder={sp.profile?.name ?? "Naziv salona"}
                        className="w-full max-w-xs border border-red-300 dark:border-red-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      />
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            sp.deleteProfile();
                            setConfirmDeleteSalon(false);
                            setDeleteSalonInput("");
                          }}
                          disabled={
                            sp.isDeleting ||
                            deleteSalonInput.trim() !==
                              (sp.profile?.name ?? "").trim()
                          }
                          className="px-5 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {sp.isDeleting ? "Brisanje..." : "Da, obriši salon"}
                        </button>
                        <button
                          onClick={() => {
                            setConfirmDeleteSalon(false);
                            setDeleteSalonInput("");
                          }}
                          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                        >
                          Odustani
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteSalon(true)}
                      className="px-5 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                    >
                      Obriši salon
                    </button>
                  )}
                </div>
              )}

              {/* ── Delete account ── */}
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-0.5">
                  Obriši nalog
                </p>
                <p className="text-xs text-red-500 dark:text-red-400/70 mb-3">
                  Trajno briše vaš nalog, salon i sve podatke. Ova radnja je
                  nepovratna.
                </p>
                {showDeleteAccount ? (
                  <div className="space-y-3">
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Upišite vašu email adresu{" "}
                      <span className="font-bold">
                        &quot;{user?.email}&quot;
                      </span>{" "}
                      da biste potvrdili:
                    </p>
                    <input
                      type="email"
                      value={deleteAccountInput}
                      onChange={(e) => setDeleteAccountInput(e.target.value)}
                      placeholder={user?.email ?? "email@adresa.com"}
                      className="w-full max-w-xs border border-red-300 dark:border-red-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={
                          isDeletingAccount ||
                          deleteAccountInput.trim().toLowerCase() !==
                            (user?.email ?? "").toLowerCase()
                        }
                        className="px-5 py-2 bg-red-700 text-white text-sm font-bold rounded-xl hover:bg-red-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isDeletingAccount
                          ? "Brisanje..."
                          : "Da, trajno obriši nalog"}
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteAccount(false);
                          setDeleteAccountInput("");
                        }}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                      >
                        Odustani
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteAccount(true)}
                    className="px-5 py-2 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-semibold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                  >
                    Obriši nalog
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: Radno vreme ═══════════════════════════════════════ */}
      {tab === "radno-vreme" && (
        <div className={card}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Radno vreme
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
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
                  className={`rounded-2xl border p-4 transition-colors ${isRest ? "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800" : "bg-violet-50/40 dark:bg-gray-900 border-violet-100 dark:border-violet-900/40"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-[108px] flex-shrink-0 text-sm font-bold text-gray-700 dark:text-gray-300">
                        {day}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${isRest ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400" : "bg-violet-200 dark:bg-violet-900/50 text-violet-700 dark:text-violet-400"}`}
                      >
                        {isRest ? "Neradan" : `${slots.length} smena`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => sp.addTimeSlot(day)}
                        className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 px-3 py-1.5 rounded-lg transition"
                      >
                        + Smena
                      </button>
                      {!isRest && (
                        <button
                          onClick={() => sp.clearDay(day)}
                          className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
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
                          <span className="text-xs text-gray-400 w-4 text-right">
                            {idx + 1}.
                          </span>
                          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5 flex-1">
                            <span className="text-xs text-gray-400 font-medium">
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
                              className="text-sm font-semibold text-gray-800 dark:text-gray-200 bg-transparent focus:outline-none"
                            />
                            <span className="text-gray-300 dark:text-gray-600">
                              |
                            </span>
                            <span className="text-xs text-gray-400 font-medium">
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
                              className="text-sm font-semibold text-gray-800 dark:text-gray-200 bg-transparent focus:outline-none"
                            />
                          </div>
                          <button
                            onClick={() => sp.removeTimeSlot(day, idx)}
                            className="w-8 h-8 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-lg"
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

      {/* ═══ TAB: Social & SEO ══════════════════════════════════════ */}
      {tab === "social-seo" && (
        <div className="space-y-6">
          <div className={card}>
            <h2 className="font-bold text-gray-900 dark:text-white mb-5">
              Društvene mreže
            </h2>
            <div className="space-y-3">
              {(["instagram", "facebook", "tiktok"] as const).map((net) => (
                <div key={net} className="flex items-center gap-4">
                  <span className="w-24 text-sm font-semibold text-gray-600 dark:text-gray-400 capitalize">
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
            <h2 className="font-bold text-gray-900 dark:text-white mb-1">
              SEO Metadata
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
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
                  className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3"
                >
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-2.5 py-1 rounded-lg">
                    {page}
                  </span>
                  <div className="mt-2">
                    <label className={lbl}>
                      Title{" "}
                      <span className="font-normal normal-case text-gray-300 dark:text-gray-600">
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
                    <p className="text-[11px] text-right mt-1 text-gray-400">
                      {(sp.form.seo[tk] ?? "").length}/60
                    </p>
                  </div>
                  <div>
                    <label className={lbl}>
                      Description{" "}
                      <span className="font-normal normal-case text-gray-300 dark:text-gray-600">
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
                    <p className="text-[11px] text-right mt-1 text-gray-400">
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

      {/* ═══ TAB: CMS ═══════════════════════════════════════════════ */}
      {tab === "cms" && <AdminLandingCMS sp={sp} />}

      {/* ═══ TAB: Usluge ════════════════════════════════════════════ */}
      {tab === "usluge" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Usluge
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {svc.services.length} ukupno
              </p>
            </div>
            <button
              onClick={svc.openCreate}
              className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition"
            >
              + Dodaj uslugu
            </button>
          </div>
          {svc.isLoading && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-16">
              <span className="w-5 h-5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin inline-block" />
              Učitavanje usluga...
            </div>
          )}
          {!svc.isLoading && svc.services.length === 0 && (
            <div className={card + " text-center py-16"}>
              <div className="text-5xl mb-4">✂️</div>
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Nema usluga
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                Dodajte prvu uslugu i ona će se prikazati klijentima.
              </p>
              <button
                onClick={svc.openCreate}
                className="cursor-pointer px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition"
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
                    <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
                      {cat}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {items.length}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
                    {items.map((srv, i) => (
                      <div
                        key={srv._id}
                        className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition group ${i > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                              {srv.name}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${TYPE_BADGE[srv.type] ?? "bg-gray-100 text-gray-500"}`}
                            >
                              {srv.type}
                            </span>
                            {srv.featured && srv.featured !== "none" && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                ★ {srv.featured}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              {servicePrice(srv)}
                            </span>
                            {srv.duration && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                ⏱ {srv.duration} min
                              </span>
                            )}
                            {srv.subcategory && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {srv.subcategory}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => svc.openEdit(srv)}
                            className="p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition text-sm"
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
                                className="px-2 py-1.5 text-gray-400 text-xs hover:text-gray-600"
                              >
                                Odustani
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => svc.setDeleteConfirmId(srv._id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-sm"
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

      {/* ═══ Passthrough tabs ═══════════════════════════════════════ */}
      {tab === "termini" && <AdminAppointments />}
      {tab === "kalendar" && <AppointmentAdminCalendar />}
      {tab === "statistika" && (
        <FeatureGate feature="statistics">
          <StatisticsPage />
        </FeatureGate>
      )}
      {tab === "newsletter" && (
        <FeatureGate feature="newsletter">
          <AdminNewsletterDashboard />
        </FeatureGate>
      )}
      {tab === "email-campaign-ai" && (
        <FeatureGate feature="unlimitedAiTokens" requiredPlan="enterprise">
          <EmailCampaignAIGenerator />
        </FeatureGate>
      )}
      {tab === "preporuke" && <AdminTestimonials />}
      {tab === "domen" && <AdminCustomDomain />}
      {tab === "klijenti" && <ClientsList />}
      {tab === "chat" && <AdminChat />}

      {/* Service modal */}
      {svc.modalMode !== "closed" && <ServiceModal s={svc} />}
    </DashboardLayout>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<Loader />}>
      <AdminDashboard />
    </Suspense>
  );
}
