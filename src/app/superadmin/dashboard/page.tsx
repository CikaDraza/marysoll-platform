// app/superadmin/dashboard/page.tsx
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { PLAN_FEATURES } from "@/lib/plans/planFeatures";
import { AuthStatusButton } from "@/components/auth/AuthStatusButton";
import {
  UsersIcon,
  ChartBarIcon,
  CreditCardIcon,
  CogIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useSuperAdminTenants } from "@/hooks/useSuperAdminTenants";
import type { TenantRow } from "@/hooks/useSuperAdminTenants";
import Image from "next/image";
import Link from "next/link";
import AlertModal from "@/components/modals/AlertModal";
import { SuperAdminChatWorkspace } from "@/components/admin/chat/SuperAdminChatWorkspace";

// ─── Tab types ────────────────────────────────────────────────────────────────
type Tab =
  | "saloni"
  | "trial"
  | "planovi"
  | "statistika"
  | "korisnici"
  | "kategorije"
  | "podesavanja"
  | "chat"
  | "profil";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "saloni", label: "Saloni", icon: UsersIcon },
  { id: "trial", label: "Trial period", icon: ShieldCheckIcon },
  { id: "planovi", label: "Planovi", icon: CreditCardIcon },
  { id: "statistika", label: "Statistika", icon: ChartBarIcon },
  { id: "korisnici", label: "Korisnici", icon: UsersIcon },
  { id: "kategorije", label: "Kategorije", icon: TagIcon },
  { id: "podesavanja", label: "Podešavanja", icon: CogIcon },
  { id: "chat", label: "Chat", icon: ChatBubbleLeftRightIcon },
  { id: "profil", label: "Profil", icon: UserCircleIcon },
];

// ─── Shared styles ────────────────────────────────────────────────────────────
const inp =
  "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-400";
const lbl =
  "block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5";
const card = "bg-slate-800 rounded-xl border border-slate-700 p-5";
const btnPrimary =
  "px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-500 transition disabled:opacity-40";
const btnDanger =
  "px-4 py-2 bg-red-700 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition disabled:opacity-40";
const btnGreen =
  "px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition disabled:opacity-40";
// const btnGhost =
//   "px-3 py-1.5 border border-slate-600 text-slate-300 text-xs font-semibold rounded-lg hover:border-slate-400 hover:text-white transition";

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-900/60 text-emerald-400 border-emerald-700",
    suspended: "bg-red-900/60 text-red-400 border-red-700",
    pending: "bg-amber-900/60 text-amber-400 border-amber-700",
    cancelled: "bg-slate-700 text-slate-400 border-slate-600",
  };
  const labels: Record<string, string> = {
    active: "Aktivan",
    suspended: "Suspendovan",
    pending: "Na čekanju",
    cancelled: "Otkazan",
  };
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors[status] ?? colors.cancelled}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: "bg-slate-700 text-slate-300",
    starter: "bg-blue-900/60 text-blue-400",
    pro: "bg-violet-900/60 text-violet-400",
    enterprise: "bg-amber-900/60 text-amber-400",
  };
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${colors[plan] ?? colors.free}`}
    >
      {plan}
    </span>
  );
}

// ─── Main dashboard ────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("saloni");
  const [selectedTenant, setSelectedTenant] = useState<TenantRow | null>(null);
  const sa = useSuperAdminTenants();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user?.isSuperAdmin) {
      window.location.replace("/login");
    }
  }, [authLoading, user]);

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div>
          <Link href="/" className="flex gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white font-black text-lg shadow-lg">
              M
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Marysoll SuperAdmin
              </h1>
              <p className="text-xs text-violet-400 -mt-1.5">
                Platform for small businesses
              </p>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="bg-slate-700 px-2 py-1 rounded">
            {sa.stats?.totalTenants ?? "—"} salona
          </span>
          <span className="bg-emerald-900/40 text-emerald-400 px-2 py-1 rounded">
            {sa.stats?.trialTenants ?? "—"} u trialu
          </span>
          <span className="bg-violet-900/40 text-violet-400 px-2 py-1 rounded">
            {sa.stats?.paidTenants ?? "—"} plaćenih
          </span>
          <AuthStatusButton theme="dark" logoutRedirect="/login" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-56 bg-slate-800 border-r border-slate-700 flex-shrink-0 py-4">
          <ul className="space-y-0.5 px-2">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeTab === t.id
                      ? "bg-violet-600 text-white font-semibold"
                      : "text-slate-400 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <t.icon className="size-4 flex-shrink-0" />
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {activeTab === "saloni" && (
            <SaloniTab
              sa={sa}
              onSelect={setSelectedTenant}
              selectedId={selectedTenant?._id ?? null}
            />
          )}
          {activeTab === "trial" && <TrialTab sa={sa} tenants={sa.tenants} />}
          {activeTab === "planovi" && (
            <PlanoviTab sa={sa} tenants={sa.tenants} />
          )}
          {activeTab === "statistika" && (
            <StatistikaTab stats={sa.stats} tenants={sa.tenants} />
          )}
          {activeTab === "korisnici" && <KorisniciTab />}
          {activeTab === "kategorije" && <KategorijeTab />}
          {activeTab === "podesavanja" && <PodesavanjaTab sa={sa} />}
          {activeTab === "profil" && <ProfilTab />}
          {activeTab === "chat" && (
            <ChatTab
              tenants={sa.tenants}
              selected={selectedTenant}
              onSelect={setSelectedTenant}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Salon identity edit panel ────────────────────────────────────────────────
function SalonIdentityPanel({
  t,
  sa,
}: {
  t: TenantRow;
  sa: ReturnType<typeof useSuperAdminTenants>;
}) {
  const [form, setForm] = useState({
    slug: t.slug,
    customDomain: t.customDomain ?? "",
    cloudinaryFolder: t.cloudinaryFolder,
  });

  // Sync when parent row updates (after save)
  useEffect(() => {
    setForm({
      slug: t.slug,
      customDomain: t.customDomain ?? "",
      cloudinaryFolder: t.cloudinaryFolder,
    });
  }, [t.slug, t.customDomain, t.cloudinaryFolder]);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    sa.updateIdentity(t._id, {
      slug: form.slug,
      customDomain: form.customDomain || null,
      cloudinaryFolder: form.cloudinaryFolder,
    });
  };

  return (
    <div
      className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Slug */}
      <div>
        <label className={lbl}>Slug</label>
        <input
          className={inp + " font-mono"}
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          placeholder="ime-salona"
        />
        <p className="mt-1 text-[10px] text-slate-500">
          Subdomen: <span className="text-slate-300 font-mono">{form.slug || "—"}.marysoll.com</span>
        </p>
      </div>

      {/* Custom domain */}
      <div>
        <label className={lbl}>Custom domen</label>
        <input
          className={inp + " font-mono"}
          value={form.customDomain}
          onChange={(e) => setForm((f) => ({ ...f, customDomain: e.target.value }))}
          placeholder="salon.rs (bez https://)"
        />
        <p className="mt-1 text-[10px] text-slate-500">
          Ostavite prazno da biste uklonili custom domen.
        </p>
      </div>

      {/* Cloudinary folder */}
      <div className="sm:col-span-2">
        <label className={lbl}>Cloudinary folder</label>
        <input
          className={inp + " font-mono"}
          value={form.cloudinaryFolder}
          onChange={(e) => setForm((f) => ({ ...f, cloudinaryFolder: e.target.value }))}
          placeholder="salons/salon-ime"
        />
      </div>

      {/* Actions */}
      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        <button
          disabled
          className="px-4 py-2 bg-slate-700 text-slate-400 text-xs font-bold rounded-lg cursor-not-allowed"
          title="Uskoro dostupno"
        >
          Statistika
        </button>
        <button
          onClick={handleSave}
          disabled={sa.isUpdatingIdentity}
          className={btnPrimary}
        >
          {sa.isUpdatingIdentity ? "Čuvam..." : "Sačuvaj"}
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Saloni ──────────────────────────────────────────────────────────────
function SaloniTab({
  sa,
  onSelect,
  selectedId,
}: {
  sa: ReturnType<typeof useSuperAdminTenants>;
  onSelect: (t: TenantRow) => void;
  selectedId: string | null;
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<TenantRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return sa.tenants.filter((t) => {
      const matchSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.owner?.email.toLowerCase().includes(search.toLowerCase()) ||
        t.slug.includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || t.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [sa.tenants, search, filterStatus]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Svi saloni ({filtered.length})</h2>
        <div className="flex gap-2">
          <input
            className={inp + " w-48"}
            placeholder="Pretraga..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={inp + " w-36"}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Svi statusi</option>
            <option value="active">Aktivni</option>
            <option value="pending">Na čekanju</option>
            <option value="suspended">Suspendovani</option>
            <option value="cancelled">Otkazani</option>
          </select>
        </div>
      </div>

      {sa.isLoading && (
        <div className="flex items-center gap-2 text-slate-400 py-8">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          Učitavanje...
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((t) => {
          const isExpanded = expandedId === t._id;
          return (
            <div
              key={t._id}
              className={`${card} transition ${
                selectedId === t._id
                  ? "border-violet-500 ring-1 ring-violet-500/30"
                  : "hover:border-slate-500"
              }`}
            >
              {/* Card header row */}
              <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => {
                  onSelect(t);
                  toggleExpand(t._id);
                }}
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{t.name}</span>
                    <StatusBadge status={t.status} />
                    <PlanBadge plan={t.plan} />
                    {t.isTrialActive && (
                      <span className="text-[10px] bg-amber-900/60 text-amber-400 border border-amber-700 px-2 py-0.5 rounded-full font-bold">
                        TRIAL {t.trialDaysLeft}d
                      </span>
                    )}
                    {!t.owner?.isEmailVerified && (
                      <span className="text-[10px] bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full">
                        Email nepotvrđen
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-slate-400">
                    <span className="font-mono">{t.slug}</span>
                    <span>{t.owner?.email ?? "—"}</span>
                    <span>{t.owner?.name ?? "—"}</span>
                    <span>{new Date(t.createdAt).toLocaleDateString("sr-RS")}</span>
                  </div>
                </div>

                {/* Quick actions */}
                <div
                  className="flex gap-2 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t.status !== "active" && (
                    <button
                      onClick={() => sa.setStatus(t._id, "active")}
                      disabled={sa.isUpdatingStatus}
                      className={btnGreen}
                    >
                      Aktiviraj
                    </button>
                  )}
                  {t.status === "active" && (
                    <button
                      onClick={() => sa.setStatus(t._id, "suspended")}
                      disabled={sa.isUpdatingStatus}
                      className={btnDanger}
                    >
                      Suspenduj
                    </button>
                  )}
                  {!t.isTrialActive && (
                    <button
                      onClick={() => sa.activateTrial(t._id, 30)}
                      disabled={sa.isUpdatingTrial}
                      className={btnPrimary}
                    >
                      Trial 30d
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); }}
                    disabled={sa.isDeletingTenant}
                    className={btnDanger}
                  >
                    Obriši
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleExpand(t._id); }}
                    className="px-2 py-2 text-slate-400 hover:text-white transition"
                    title={isExpanded ? "Zatvori" : "Otvori podešavanja"}
                  >
                    {isExpanded ? "▲" : "▼"}
                  </button>
                </div>
              </div>

              {/* Expandable identity panel */}
              {isExpanded && <SalonIdentityPanel t={t} sa={sa} />}
            </div>
          );
        })}

        {filtered.length === 0 && !sa.isLoading && (
          <p className="text-slate-500 text-sm py-8 text-center">
            Nema rezultata.
          </p>
        )}
      </div>

      <AlertModal
        open={!!deleteTarget}
        setOpen={(v) => { if (!v) setDeleteTarget(null); }}
        title="Trajno brisanje salona"
        message={`Da li ste sigurni da želite trajno obrisati salon "${deleteTarget?.name}"? Ova akcija će obrisati sve podatke salona i ne može se opozvati.`}
        onConfirm={() => {
          if (deleteTarget) {
            sa.deleteTenant(deleteTarget._id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}

// ─── Tab: Trial ───────────────────────────────────────────────────────────────
const PRO_TRIAL_PRESET = Object.fromEntries(
  (Object.entries(PLAN_FEATURES.pro) as [string, unknown][]).filter(
    ([, v]) => typeof v === "boolean" && v === true,
  ),
) as Record<string, boolean>;

const ENTERPRISE_TRIAL_PRESET = Object.fromEntries(
  (Object.entries(PLAN_FEATURES.enterprise) as [string, unknown][]).filter(
    ([, v]) => typeof v === "boolean" && v === true,
  ),
) as Record<string, boolean>;

function TrialTab({
  sa,
  tenants,
}: {
  sa: ReturnType<typeof useSuperAdminTenants>;
  tenants: TenantRow[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const [days, setDays] = useState("30");
  // const [customTrialDays, setCustomTrialDays] = useState("");

  const tenant = tenants.find((t) => t._id === selectedId);
  const activatedPreset: "pro" | "enterprise" | null =
    tenant?.overrideNote === "Pro trial override"
      ? "pro"
      : tenant?.overrideNote === "Enterprise trial override"
        ? "enterprise"
        : null;
  const trialTenants = tenants.filter((t) => t.isTrialActive);
  const expiredTrials = tenants.filter(
    (t) =>
      !t.isTrialActive && t.trialEndsAt && new Date(t.trialEndsAt) < new Date(),
  );

  return (
    <div className="space-y-6 max-w-full">
      <h2 className="text-lg font-bold">Upravljanje trial periodom</h2>

      {/* Trial mode info */}
      <div className={card}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Aktuelni mod triala</h3>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              sa.platformSettings?.trialMode === "card_required"
                ? "bg-violet-900/60 text-violet-300"
                : "bg-emerald-900/60 text-emerald-300"
            }`}
          >
            {sa.platformSettings?.trialMode === "card_required"
              ? "Kartica obavezna"
              : "Besplatan trial"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
          <div>
            <p className="text-slate-500 text-xs mb-1">Default trajanje</p>
            <p className="font-semibold">
              {sa.platformSettings?.defaultTrialDays ?? 30} dana
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">Auto-odobravanje</p>
            <p className="font-semibold">
              {sa.platformSettings?.autoApproveTrials ? "Da" : "Ne"}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Promenite ova podešavanja u tabu <strong>Podešavanja</strong>.
        </p>
      </div>

      {/* Trial action */}
      <div className={card}>
        <h3 className="font-semibold text-sm mb-4">
          Upravljanje trialom za salon
        </h3>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Izaberite salon</label>
            <select
              className={inp}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">— Izaberite salon —</option>
              {tenants.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.owner?.email}) — {t.status}
                  {t.isTrialActive ? ` — Trial još ${t.trialDaysLeft}d` : ""}
                </option>
              ))}
            </select>
          </div>

          {tenant && (
            <div className="bg-slate-700 rounded-lg p-3 text-sm space-y-1">
              <div className="flex gap-4">
                <span>
                  Status: <StatusBadge status={tenant.status} />
                </span>
                <span>
                  Plan: <PlanBadge plan={tenant.plan} />
                </span>
              </div>
              {tenant.isTrialActive ? (
                <p className="text-amber-400">
                  ✓ Trial aktivan — ističe:{" "}
                  {tenant.trialEndsAt
                    ? new Date(tenant.trialEndsAt).toLocaleDateString("sr-RS")
                    : "—"}{" "}
                  ({tenant.trialDaysLeft}d)
                </p>
              ) : (
                <p className="text-slate-400">Trial nije aktivan</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="w-auto">
              <label className={lbl}>Broj dana</label>
              <input
                type="number"
                className={`${inp} w-auto!`}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                min={1}
                max={365}
              />
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() =>
                selectedId && sa.activateTrial(selectedId, parseInt(days) || 30)
              }
              disabled={!selectedId || sa.isUpdatingTrial}
              className={btnGreen}
            >
              {tenant?.isTrialActive ? "Restartuj trial" : "Aktiviraj trial"}
            </button>
            <button
              onClick={() =>
                selectedId && sa.extendTrial(selectedId, parseInt(days) || 7)
              }
              disabled={!selectedId || sa.isUpdatingTrial}
              className={btnPrimary}
            >
              Produži za {days || 7} dana
            </button>
            {tenant?.isTrialActive && (
              <button
                onClick={() => selectedId && sa.deactivateTrial(selectedId)}
                disabled={sa.isUpdatingTrial}
                className={btnDanger}
              >
                Završi trial odmah
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trial plan presets */}
      {tenant && (
        <div className={card}>
          <h3 className="font-semibold text-sm mb-2 text-white">
            Funkcionalnosti tokom triala
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Aktiviraj sve Pro ili Enterprise feature-e kao privremeni override
            za trajanje triala.
          </p>
          <div className="flex gap-3 flex-wrap items-center">
            {activatedPreset ? (
              <>
                <span
                  className={`px-4 py-2 text-white text-xs font-bold rounded-lg ${
                    activatedPreset === "pro" ? "bg-violet-500" : "bg-amber-500"
                  }`}
                >
                  ✓ {activatedPreset === "pro" ? "Pro" : "Enterprise"}{" "}
                  funkcionalnosti aktivirane
                </span>
                <button
                  onClick={() => sa.removeFeatureOverride(selectedId)}
                  disabled={sa.isRemovingOverride}
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition disabled:opacity-40"
                >
                  {sa.isRemovingOverride ? "Deaktiviranje..." : "Deaktiviraj"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() =>
                    sa.setFeatureOverride(selectedId, {
                      overrides: PRO_TRIAL_PRESET,
                      expiresAt: tenant.trialEndsAt
                        ? new Date(tenant.trialEndsAt).toISOString()
                        : new Date(
                            Date.now() + 30 * 24 * 60 * 60 * 1000,
                          ).toISOString(),
                      note: "Pro trial override",
                    })
                  }
                  disabled={sa.isSettingOverride}
                  className="px-4 py-2 bg-violet-700 hover:bg-violet-600 text-white text-xs font-bold rounded-lg transition disabled:opacity-40"
                >
                  Aktiviraj Pro funkcionalnosti
                </button>
                <button
                  onClick={() =>
                    sa.setFeatureOverride(selectedId, {
                      overrides: ENTERPRISE_TRIAL_PRESET,
                      expiresAt: tenant.trialEndsAt
                        ? new Date(tenant.trialEndsAt).toISOString()
                        : new Date(
                            Date.now() + 30 * 24 * 60 * 60 * 1000,
                          ).toISOString(),
                      note: "Enterprise trial override",
                    })
                  }
                  disabled={sa.isSettingOverride}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition disabled:opacity-40"
                >
                  Aktiviraj Enterprise funkcionalnosti
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Trial overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={card}>
          <h3 className="font-semibold text-sm mb-3 text-amber-400">
            Aktivni triali ({trialTenants.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {trialTenants.length === 0 && (
              <p className="text-slate-500 text-xs">Nema aktivnih triala.</p>
            )}
            {trialTenants.map((t) => (
              <div
                key={t._id}
                className="flex items-center justify-between text-xs text-slate-300"
              >
                <span className="font-medium">{t.name}</span>
                <span className="text-amber-400">{t.trialDaysLeft}d</span>
              </div>
            ))}
          </div>
        </div>

        <div className={card}>
          <h3 className="font-semibold text-sm mb-3 text-red-400">
            Istekli triali ({expiredTrials.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {expiredTrials.length === 0 && (
              <p className="text-slate-500 text-xs">Nema isteklih triala.</p>
            )}
            {expiredTrials.map((t) => (
              <div
                key={t._id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-slate-300">{t.name}</span>
                <button
                  onClick={() => sa.activateTrial(t._id, 30)}
                  disabled={sa.isUpdatingTrial}
                  className="text-violet-400 hover:text-violet-300 font-semibold"
                >
                  Obnovi
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Planovi ─────────────────────────────────────────────────────────────
// ─── Tab: Planovi ─────────────────────────────────────────────────────────────

const FEATURE_GROUPS: {
  label: string;
  keys: (keyof import("@/lib/plans/planFeatures").PlanFeatures)[];
}[] = [
  {
    label: "Core",
    keys: [
      "customDomain",
      "appointments",
      "emailNotifications",
      "pushNotifications",
      "testimonials",
    ],
  },
  {
    label: "Newsletter",
    keys: [
      "newsletter",
      "newsletterCampaigns",
      "newsletterLanding",
      "newsletterStats",
    ],
  },
  {
    label: "Statistika",
    keys: ["statistics"],
  },
  {
    label: "AI funkcionalnosti",
    keys: [
      "aiAssistant",
      "aiImageGeneration",
      "aiSeoGeneration",
      "aiEmailTemplates",
      "aiLandingPages",
      "aiMarketingAnalysis",
    ],
  },
  {
    label: "Plaćanje & Loyalty",
    keys: ["paymentIntegration", "loyaltySystem", "clientSubscriptions"],
  },
  {
    label: "Enterprise",
    keys: [
      "emailCampaignAi",
      "socialMediaAds",
      "googleBusinessOptimization",
      "videoCreation",
      "aeoGeoOptimization",
      "unlimitedAiTokens",
    ],
  },
];

const FEATURE_LABELS: Record<string, string> = {
  customDomain: "Custom domen",
  appointments: "Zakazivanje termina",
  emailNotifications: "Email notifikacije",
  pushNotifications: "Push notifikacije",
  testimonials: "Testimonials / Preporuke",
  newsletter: "Newsletter (osnovno)",
  newsletterCampaigns: "Newsletter kampanje",
  newsletterLanding: "Newsletter landing stranice",
  newsletterStats: "Statistika newslettera",
  statistics: "Statistika salona",
  aiAssistant: "AI asistent za zakazivanje",
  aiImageGeneration: "AI generisanje slika",
  aiSeoGeneration: "AI SEO optimizacija",
  aiEmailTemplates: "AI email templati",
  aiLandingPages: "AI landing stranice",
  aiMarketingAnalysis: "AI marketing analiza",
  paymentIntegration: "Integracija plaćanja",
  loyaltySystem: "Loyalty bodovi",
  clientSubscriptions: "Mesečna pretplata klijenata",
  emailCampaignAi: "Email Campaign AI",
  socialMediaAds: "Social media ads",
  googleBusinessOptimization: "Google Business",
  videoCreation: "Kreiranje videa",
  aeoGeoOptimization: "AEO/GEO optimizacija",
  unlimitedAiTokens: "Neograničeni AI tokeni",
};

const PLAN_INFO = [
  {
    id: "free",
    label: "Free",
    price: "0 EUR",
    desc: "Trial, osnovna funkcionalnost",
  },
  {
    id: "starter",
    label: "Starter",
    price: "19 EUR",
    desc: "Newsletter, statistika, 128GB",
  },
  {
    id: "pro",
    label: "Pro",
    price: "49 EUR",
    desc: "AI, payments, loyalty, 512GB",
  },
  {
    id: "enterprise",
    label: "Enterprise",
    price: "Po dogovoru",
    desc: "Sve + neograničeno",
  },
] as const;

function PlanoviTab({
  sa,
  tenants,
}: {
  sa: ReturnType<typeof useSuperAdminTenants>;
  tenants: TenantRow[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const [plan, setPlan] = useState<"free" | "starter" | "pro" | "enterprise">(
    "free",
  );

  // Override state
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [overrideExpiry, setOverrideExpiry] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [overrideNote, setOverrideNote] = useState("");

  const selectedTenant = tenants.find((t) => t._id === selectedId);

  function toggleOverride(key: string) {
    setOverrides((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleApplyOverride() {
    if (!selectedId) return;
    sa.setFeatureOverride(selectedId, {
      overrides,
      expiresAt: new Date(overrideExpiry).toISOString(),
      note: overrideNote,
    });
  }

  function handleRemoveOverride() {
    if (!selectedId) return;
    sa.removeFeatureOverride(selectedId);
    setOverrides({});
  }

  return (
    <div className="space-y-6 max-w-full">
      <h2 className="text-lg font-bold">Upravljanje planovima</h2>

      {/* Plan counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PLAN_INFO.map((p) => {
          const count = tenants.filter((t) => t.plan === p.id).length;
          return (
            <div key={p.id} className={`${card} text-center`}>
              <PlanBadge plan={p.id} />
              <p className="text-2xl font-black text-white mt-2">{count}</p>
              <p className="text-xs text-slate-400">{p.label}</p>
              <p className="text-xs text-slate-500 mt-1">{p.price}/mes</p>
            </div>
          );
        })}
      </div>

      {/* Salon selector */}
      <div className={card}>
        <h3 className="font-semibold text-sm mb-4 text-white">Izaberi salon</h3>
        <select
          className={inp}
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setOverrides({});
            setOverrideEnabled(false);
          }}
        >
          <option value="">— Izaberite salon —</option>
          {tenants.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name} ({t.slug}) — plan: {t.plan} — {t.status}
            </option>
          ))}
        </select>

        {selectedTenant && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <StatusBadge status={selectedTenant.status} />
            <PlanBadge plan={selectedTenant.plan} />
            {selectedTenant.isTrialActive && (
              <span className="text-[10px] bg-amber-900/60 text-amber-400 border border-amber-700 px-2 py-0.5 rounded-full font-bold">
                TRIAL {selectedTenant.trialDaysLeft}d
              </span>
            )}
            <span className="text-xs text-slate-400 ml-1">
              {selectedTenant.owner?.email}
            </span>
          </div>
        )}
      </div>

      {selectedId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Change plan */}
          <div className={card}>
            <h3 className="font-semibold text-sm mb-4 text-white">
              Promeni plan
            </h3>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Novi plan</label>
                <select
                  className={inp}
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as typeof plan)}
                >
                  {PLAN_INFO.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} — {p.price}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg text-xs text-slate-400 leading-relaxed">
                {PLAN_INFO.find((p) => p.id === plan)?.desc}
              </div>
              <button
                onClick={() => selectedId && sa.setPlan(selectedId, plan)}
                disabled={!selectedId || sa.isUpdatingPlan}
                className={btnPrimary}
              >
                {sa.isUpdatingPlan ? "Ažuriranje..." : "Sačuvaj plan"}
              </button>
            </div>
          </div>

          {/* Feature override */}
          <div className={card}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-white">
                Feature override
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Za testiranje</span>
                <button
                  onClick={() => setOverrideEnabled(!overrideEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${overrideEnabled ? "bg-violet-600" : "bg-slate-600"}`}
                >
                  <div
                    className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${overrideEnabled ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </button>
              </div>
            </div>

            {!overrideEnabled ? (
              <p className="text-xs text-slate-500 leading-relaxed">
                Omogući override da aktiviraš specifične feature-e za ovaj salon
                bez mijenjanja plana. Korisno za testiranje i demo.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Feature toggles by group */}
                <div className="max-h-72 overflow-y-auto space-y-4 pr-1">
                  {FEATURE_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        {group.label}
                      </p>
                      <div className="space-y-1.5">
                        {group.keys.map((key) => {
                          const keyStr = String(key);
                          const isOn = !!overrides[keyStr];
                          return (
                            <label
                              key={keyStr}
                              className="flex items-center gap-3 cursor-pointer group"
                            >
                              <button
                                onClick={() => toggleOverride(keyStr)}
                                className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 relative ${isOn ? "bg-emerald-500" : "bg-slate-600 group-hover:bg-slate-500"}`}
                              >
                                <div
                                  className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${isOn ? "translate-x-4" : "translate-x-0.5"}`}
                                />
                              </button>
                              <span
                                className={`text-xs ${isOn ? "text-emerald-400 font-semibold" : "text-slate-400"}`}
                              >
                                {FEATURE_LABELS[keyStr] ?? keyStr}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Expiry + note */}
                <div className="space-y-2 pt-2 border-t border-slate-700">
                  <div>
                    <label className={lbl}>Override važi do</label>
                    <input
                      type="date"
                      className={inp}
                      value={overrideExpiry}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setOverrideExpiry(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={lbl}>Napomena (opciono)</label>
                    <input
                      type="text"
                      className={inp}
                      value={overrideNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                      placeholder="npr. Demo za klijenta"
                    />
                  </div>
                </div>

                {/* Active override count */}
                {Object.values(overrides).some(Boolean) && (
                  <div className="text-xs bg-violet-900/40 border border-violet-700 rounded-lg px-3 py-2 text-violet-300">
                    {Object.values(overrides).filter(Boolean).length} feature-a
                    aktivirano override-om
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleApplyOverride}
                    disabled={
                      !Object.values(overrides).some(Boolean) ||
                      sa.isSettingOverride
                    }
                    className={btnPrimary}
                  >
                    {sa.isSettingOverride ? "Čuvanje..." : "Primeni override"}
                  </button>
                  <button
                    onClick={handleRemoveOverride}
                    disabled={sa.isRemovingOverride}
                    className="px-4 py-2 border border-slate-600 text-slate-400 text-xs font-bold rounded-lg hover:border-red-600 hover:text-red-400 transition disabled:opacity-40"
                  >
                    {sa.isRemovingOverride ? "..." : "Ukloni override"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment modes info */}
      <div className={card}>
        <h3 className="font-semibold text-sm mb-3 text-white">
          Načini plaćanja
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-700 rounded-xl p-4 border border-emerald-800/50">
            <h4 className="font-bold text-emerald-400 text-sm mb-2">
              🎁 Besplatan trial
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Korisnik registruje salon i dobija N dana besplatno bez unošenja
              kartice.
            </p>
            <div className="text-xs text-emerald-300 space-y-1 mt-3">
              <p>✓ Niža barijera za ulazak</p>
              <p>✓ Brži onboarding</p>
              <p>✗ Viši churn rate</p>
            </div>
          </div>
          <div className="bg-slate-700 rounded-xl p-4 border border-violet-800/50">
            <h4 className="font-bold text-violet-400 text-sm mb-2">
              💳 Trial sa karticom
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Korisnik unosi karticu pri registraciji, ne naplaćuje se tokom
              triala.
            </p>
            <div className="text-xs text-violet-300 space-y-1 mt-3">
              <p>✓ Niži churn rate</p>
              <p>✓ Automatska konverzija</p>
              <p>✗ Viša barijera</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatistikaTab({
  stats,
  tenants,
}: {
  stats: Record<string, unknown> | undefined;
  tenants: TenantRow[];
}) {
  const statusGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    tenants.forEach((t) => {
      groups[t.status] = (groups[t.status] ?? 0) + 1;
    });
    return groups;
  }, [tenants]);

  const planGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    tenants.forEach((t) => {
      groups[t.plan] = (groups[t.plan] ?? 0) + 1;
    });
    return groups;
  }, [tenants]);

  const recentTenants = [...tenants]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 10);

  const STATS = [
    { label: "Ukupno salona", value: stats?.totalTenants, color: "text-white" },
    {
      label: "Aktivni",
      value: stats?.activeTenants,
      color: "text-emerald-400",
    },
    { label: "U trialu", value: stats?.trialTenants, color: "text-amber-400" },
    { label: "Plaćeni", value: stats?.paidTenants, color: "text-violet-400" },
    {
      label: "Suspendovani",
      value: stats?.suspendedTenants,
      color: "text-red-400",
    },
    {
      label: "Novi ovaj mesec",
      value: stats?.newThisMonth,
      color: "text-blue-400",
    },
    {
      label: "Novi ove nedelje",
      value: stats?.newThisWeek,
      color: "text-cyan-400",
    },
    {
      label: "Konverzija (%)",
      value: stats?.trialConversionRate ? `${stats.trialConversionRate}%` : "—",
      color: "text-pink-400",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Statistika platforme</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className={card}>
            <p className={`text-3xl font-black ${s.color}`}>
              {String(s.value ?? "—")}
            </p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status breakdown */}
        <div className={card}>
          <h3 className="font-semibold text-sm mb-3">Po statusu</h3>
          <div className="space-y-2">
            {Object.entries(statusGroups).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <StatusBadge status={status} />
                <div className="flex items-center gap-2 flex-1 mx-3">
                  <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{
                        width: `${tenants.length > 0 ? (count / tenants.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan breakdown */}
        <div className={card}>
          <h3 className="font-semibold text-sm mb-3">Po planu</h3>
          <div className="space-y-2">
            {Object.entries(planGroups).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <PlanBadge plan={plan} />
                <div className="flex items-center gap-2 flex-1 mx-3">
                  <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{
                        width: `${tenants.length > 0 ? (count / tenants.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent registrations */}
      <div className={card}>
        <h3 className="font-semibold text-sm mb-3">Poslednje registracije</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="pb-2 text-left font-semibold">Salon</th>
                <th className="pb-2 text-left font-semibold">Vlasnik</th>
                <th className="pb-2 text-left font-semibold">Status</th>
                <th className="pb-2 text-left font-semibold">Plan</th>
                <th className="pb-2 text-left font-semibold">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recentTenants.map((t) => (
                <tr key={t._id} className="text-slate-300">
                  <td className="py-2 font-medium">{t.name}</td>
                  <td className="py-2">{t.owner?.email ?? "—"}</td>
                  <td className="py-2">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="py-2">
                    <PlanBadge plan={t.plan} />
                  </td>
                  <td className="py-2">
                    {new Date(t.createdAt).toLocaleDateString("sr-RS")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Podešavanja ─────────────────────────────────────────────────────────
function PodesavanjaTab({
  sa,
}: {
  sa: ReturnType<typeof useSuperAdminTenants>;
}) {
  const settings = sa.platformSettings as Record<string, unknown> | undefined;
  const [form, setForm] = useState({
    defaultTrialDays: String(settings?.defaultTrialDays ?? 30),
    trialMode: String(settings?.trialMode ?? "free"),
    requireEmailVerification: Boolean(
      settings?.requireEmailVerification ?? true,
    ),
    autoApproveTrials: Boolean(settings?.autoApproveTrials ?? true),
    supportEmail: String(settings?.supportEmail ?? ""),
  });

  function handleSave() {
    sa.savePlatformSettings({
      defaultTrialDays: parseInt(form.defaultTrialDays),
      trialMode: form.trialMode,
      requireEmailVerification: form.requireEmailVerification,
      autoApproveTrials: form.autoApproveTrials,
      supportEmail: form.supportEmail,
    });
  }

  return (
    <div className="space-y-6 max-w-full">
      <h2 className="text-lg font-bold">Podešavanja platforme</h2>

      {/* Trial settings */}
      <div className={card}>
        <h3 className="font-semibold text-sm mb-4 text-violet-400">
          Trial period
        </h3>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Default trajanje triala (dana)</label>
            <input
              type="number"
              className={inp}
              value={form.defaultTrialDays}
              onChange={(e) =>
                setForm((p) => ({ ...p, defaultTrialDays: e.target.value }))
              }
              min={1}
              max={365}
            />
            <p className="text-xs text-slate-500 mt-1">
              Ovaj broj dana dobija svaki novi salon pri registraciji.
            </p>
          </div>

          <div>
            <label className={lbl}>Trial mod</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: "free",
                  label: "🎁 Besplatan trial",
                  desc: "Bez kartice, odmah pristup",
                },
                {
                  value: "card_required",
                  label: "💳 Kartica obavezna",
                  desc: "Naplata, refund opcija",
                },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    form.trialMode === opt.value
                      ? "border-violet-500 bg-violet-900/20"
                      : "border-slate-600 hover:border-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="trialMode"
                    value={opt.value}
                    checked={form.trialMode === opt.value}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, trialMode: e.target.value }))
                    }
                    className="mt-0.5 accent-violet-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={lbl}>
              Auto-odobri trial pri verifikaciji emaila
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  form.autoApproveTrials ? "bg-violet-600" : "bg-slate-600"
                }`}
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    autoApproveTrials: !p.autoApproveTrials,
                  }))
                }
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                    form.autoApproveTrials ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </div>
              <span className="text-sm text-slate-300">
                {form.autoApproveTrials
                  ? "Da — trial se automatski aktivira"
                  : "Ne — superadmin ručno odobrava"}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Registration settings */}
      <div className={card}>
        <h3 className="font-semibold text-sm mb-4 text-violet-400">
          Registracija
        </h3>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Obavezna verifikacija emaila</label>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  form.requireEmailVerification
                    ? "bg-violet-600"
                    : "bg-slate-600"
                }`}
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    requireEmailVerification: !p.requireEmailVerification,
                  }))
                }
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                    form.requireEmailVerification
                      ? "translate-x-5"
                      : "translate-x-1"
                  }`}
                />
              </div>
              <span className="text-sm text-slate-300">
                {form.requireEmailVerification
                  ? "Da — email mora biti verifikovan"
                  : "Ne"}
              </span>
            </label>
          </div>

          <div>
            <label className={lbl}>Email podrške</label>
            <input
              type="email"
              className={inp}
              value={form.supportEmail}
              onChange={(e) =>
                setForm((p) => ({ ...p, supportEmail: e.target.value }))
              }
              placeholder="podrska@marysoll.com"
            />
          </div>
        </div>
      </div>

      {/* Lemon Squeezy info */}
      <div className={card}>
        <h3 className="font-semibold text-sm mb-3 text-violet-400">
          Lemon Squeezy integracija
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-300">
            <span>API Key</span>
            <span className="text-slate-500">
              {process.env.NEXT_PUBLIC_LS_CONFIGURED
                ? "✓ Konfigurisano"
                : "ENV: LEMONSQUEEZY_API_KEY"}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Webhook</span>
            <code className="text-xs text-slate-500">
              /api/webhooks/lemonsqueezy
            </code>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Konfigurišite Lemon Squeezy varijantu ID-jeve u{" "}
          <code>lib/lemonsqueezy.ts → VARIANT_TO_PLAN</code>.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={sa.isSavingSettings}
        className={btnPrimary + " w-full py-3 text-sm"}
      >
        {sa.isSavingSettings ? "Snimanje..." : "Sačuvaj podešavanja"}
      </button>
    </div>
  );
}

// ─── Tab: Profil ──────────────────────────────────────────────────────────────
function ProfilTab() {
  const { user } = useAuth();

  const [accountForm, setAccountForm] = useState({
    name: "",
    phone: "",
    marketingPhone: "",
    newsletterEmail: "",
    contactEmail: "",
  });
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState("");

  // Fetch full profile from DB on mount (JWT doesn't carry extra fields)
  useEffect(() => {
    api
      .get<{
        user: {
          name: string;
          phone: string;
          marketingPhone?: string;
          newsletterEmail?: string;
          contactEmail?: string;
        };
      }>("/auth/me")
      .then((res) => {
        const u = res.data.user;
        setAccountForm({
          name: u.name ?? "",
          phone: u.phone ?? "",
          marketingPhone: u.marketingPhone ?? "",
          newsletterEmail: u.newsletterEmail ?? "",
          contactEmail: u.contactEmail ?? "",
        });
      })
      .catch(console.error);
  }, []);

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountError("");
    setAccountLoading(true);
    try {
      await api.patch("/auth/update-profile", {
        name: accountForm.name,
        phone: accountForm.phone,
        marketingPhone: accountForm.marketingPhone,
        newsletterEmail: accountForm.newsletterEmail,
        contactEmail: accountForm.contactEmail,
      });
      alert("Podaci naloga su sačuvani.");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Greška pri čuvanju podataka.";
      setAccountError(msg);
    } finally {
      setAccountLoading(false);
    }
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

  return (
    <div className="space-y-6 max-w-full">
      <h2 className="text-lg font-bold">Profil superadmina</h2>

      {/* Account info */}
      {/* Account info + emails — single form saved to User document */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={card}>
          <h3 className="font-semibold text-sm mb-4 text-violet-400">
            Informacije naloga
          </h3>
          <form onSubmit={handleSaveAccount} className="space-y-4">
            {/* Read-only fields */}
            <div>
              <label className={lbl}>Email adresa</label>
              <div
                className={inp + " opacity-60 cursor-not-allowed select-none"}
              >
                {user?.email ?? "—"}
              </div>
            </div>
            <div>
              <label className={lbl}>Rola</label>
              <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-violet-900/60 text-violet-300 border border-violet-700 uppercase tracking-widest">
                SUPER ADMIN
              </span>
            </div>

            {/* Editable fields */}
            <div>
              <label className={lbl}>Ime</label>
              <input
                type="text"
                className={inp}
                value={accountForm.name}
                onChange={(e) =>
                  setAccountForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Vaše ime"
              />
            </div>
            <div>
              <label className={lbl}>Kontakt telefon</label>
              <input
                type="tel"
                className={inp}
                value={accountForm.phone}
                onChange={(e) =>
                  setAccountForm((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="+381 60 000 0000"
              />
              <p className="text-xs text-slate-500 mt-1">
                Interni kontakt broj za tehničku podršku.
              </p>
            </div>
            <div>
              <label className={lbl}>Marketing telefon</label>
              <input
                type="tel"
                className={inp}
                value={accountForm.marketingPhone}
                onChange={(e) =>
                  setAccountForm((p) => ({
                    ...p,
                    marketingPhone: e.target.value,
                  }))
                }
                placeholder="+381 60 000 0001"
              />
              <p className="text-xs text-slate-500 mt-1">
                Broj koji se prikazuje u marketinškim materijalima.
              </p>
            </div>
            <div>
              <label className={lbl}>Newsletter email</label>
              <input
                type="email"
                className={inp}
                value={accountForm.newsletterEmail}
                onChange={(e) =>
                  setAccountForm((p) => ({
                    ...p,
                    newsletterEmail: e.target.value,
                  }))
                }
                placeholder="newsletter@marysoll.com"
              />
              <p className="text-xs text-slate-500 mt-1">
                Adresa sa koje se šalju platformski newsletter emailovi.
              </p>
            </div>
            <div>
              <label className={lbl}>Kontakt email</label>
              <input
                type="email"
                className={inp}
                value={accountForm.contactEmail}
                onChange={(e) =>
                  setAccountForm((p) => ({
                    ...p,
                    contactEmail: e.target.value,
                  }))
                }
                placeholder="kontakt@marysoll.com"
              />
              <p className="text-xs text-slate-500 mt-1">
                Adresa za klijentske upite prema platformi.
              </p>
            </div>

            {accountError && (
              <p className="text-red-400 text-xs">{accountError}</p>
            )}
            <button
              type="submit"
              disabled={accountLoading}
              className={btnPrimary}
            >
              {accountLoading ? "Snimanje..." : "Sačuvaj podatke naloga"}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className={card}>
          <h3 className="font-semibold text-sm mb-4 text-violet-400">
            Promena lozinke
          </h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className={lbl}>Trenutna lozinka</label>
              <input
                type="password"
                className={inp}
                value={pwForm.currentPassword}
                onChange={(e) =>
                  setPwForm((p) => ({ ...p, currentPassword: e.target.value }))
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
                  setPwForm((p) => ({ ...p, newPassword: e.target.value }))
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
                  setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))
                }
                autoComplete="new-password"
                placeholder="••••••••"
              />
              {pwForm.confirmPassword &&
                pwForm.newPassword !== pwForm.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">
                    Lozinke se ne poklapaju.
                  </p>
                )}
            </div>
            {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
            <button type="submit" disabled={pwLoading} className={btnPrimary}>
              {pwLoading ? "Menjam lozinku..." : "Promeni lozinku"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Korisnici ───────────────────────────────────────────────────────────

interface AuthUserRow {
  _id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isOnline: boolean;
  lastActive: string | null;
  isEmailVerified: boolean;
  createdAt: string | null;
  isOrphan?: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-violet-900/60 text-violet-300 border-violet-700",
  ADMIN: "bg-blue-900/60 text-blue-300 border-blue-700",
  STAFF: "bg-emerald-900/60 text-emerald-300 border-emerald-700",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLE_COLORS[role] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}
    >
      {role}
    </span>
  );
}

// ─── Tab: Kategorije ──────────────────────────────────────────────────────────
interface CategoryRow {
  _id: string;
  key: string;
  label: string;
  synonyms: string[];
  subcategories: { key: string; label: string; synonyms: string[] }[];
  isActive: boolean;
  popularityScore: number;
  createdAt: string;
}

interface SubcategoryForm {
  key: string;
  label: string;
  synonyms: string;
}

interface CategoryForm {
  key: string;
  label: string;
  synonyms: string;
  subcategories: SubcategoryForm[];
  isActive: boolean;
  popularityScore: number;
}

const emptyCategoryForm = (): CategoryForm => ({
  key: "",
  label: "",
  synonyms: "",
  subcategories: [],
  isActive: true,
  popularityScore: 0,
});

function KategorijeTab() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyCategoryForm());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<CategoryRow[]>("/superadmin/categories");
      setCategories(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openCreate() {
    setEditCategory(null);
    setForm(emptyCategoryForm());
    setShowForm(true);
  }

  function openEdit(cat: CategoryRow) {
    setEditCategory(cat);
    setForm({
      key: cat.key,
      label: cat.label,
      synonyms: cat.synonyms.join(", "),
      subcategories: cat.subcategories.map((s) => ({
        key: s.key,
        label: s.label,
        synonyms: s.synonyms.join(", "),
      })),
      isActive: cat.isActive,
      popularityScore: cat.popularityScore,
    });
    setShowForm(true);
  }

  function addSubcategory() {
    setForm((f) => ({
      ...f,
      subcategories: [...f.subcategories, { key: "", label: "", synonyms: "" }],
    }));
  }

  function removeSubcategory(index: number) {
    setForm((f) => ({
      ...f,
      subcategories: f.subcategories.filter((_, i) => i !== index),
    }));
  }

  function updateSubcategory(
    index: number,
    field: keyof SubcategoryForm,
    value: string,
  ) {
    setForm((f) => {
      const updated = [...f.subcategories];
      updated[index] = { ...updated[index], [field]: value };
      return { ...f, subcategories: updated };
    });
  }

  function parseSynonyms(raw: string): string[] {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.key.trim() || !form.label.trim()) return;
    setSaving(true);
    try {
      const payload = {
        key: form.key.trim(),
        label: form.label.trim(),
        synonyms: parseSynonyms(form.synonyms),
        subcategories: form.subcategories.map((s) => ({
          key: s.key.trim(),
          label: s.label.trim(),
          synonyms: parseSynonyms(s.synonyms),
        })),
        isActive: form.isActive,
        popularityScore: form.popularityScore,
      };

      if (editCategory) {
        await api.put(`/superadmin/categories/${editCategory._id}`, payload);
      } else {
        await api.post("/superadmin/categories", payload);
      }
      setShowForm(false);
      fetchCategories();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/superadmin/categories/${id}`);
      setDeleteId(null);
      setCategories((prev) => prev.filter((c) => c._id !== id));
    } catch {
      // silent
    }
  }

  async function toggleActive(cat: CategoryRow) {
    try {
      await api.put(`/superadmin/categories/${cat._id}`, {
        isActive: !cat.isActive,
      });
      setCategories((prev) =>
        prev.map((c) =>
          c._id === cat._id ? { ...c, isActive: !c.isActive } : c,
        ),
      );
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold">Kategorije ({categories.length})</h2>
        <button onClick={openCreate} className={btnPrimary}>
          + Nova kategorija
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Učitavanje...</p>
      ) : categories.length === 0 ? (
        <div className={card + " text-center text-slate-400 text-sm py-10"}>
          Nema kategorija. Dodajte prvu.
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat._id} className={card + " space-y-3"}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">{cat.label}</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded">
                      {cat.key}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        cat.isActive
                          ? "bg-emerald-900/60 text-emerald-400 border-emerald-700"
                          : "bg-slate-700 text-slate-400 border-slate-600"
                      }`}
                    >
                      {cat.isActive ? "Aktivna" : "Neaktivna"}
                    </span>
                    {cat.popularityScore > 0 && (
                      <span className="text-[10px] text-amber-400">
                        ★ {cat.popularityScore}
                      </span>
                    )}
                  </div>
                  {cat.synonyms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {cat.synonyms.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {cat.subcategories.length > 0 && (
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === cat._id ? null : cat._id)
                      }
                      className="text-xs text-slate-400 hover:text-white transition"
                    >
                      {expandedId === cat._id ? "▲" : "▼"}{" "}
                      {cat.subcategories.length} sub
                    </button>
                  )}
                  <button
                    onClick={() => toggleActive(cat)}
                    className="text-xs text-slate-400 hover:text-white border border-slate-600 rounded px-2 py-1 transition"
                  >
                    {cat.isActive ? "Deaktiviraj" : "Aktiviraj"}
                  </button>
                  <button onClick={() => openEdit(cat)} className={btnPrimary}>
                    Uredi
                  </button>
                  <button
                    onClick={() => setDeleteId(cat._id)}
                    className={btnDanger}
                  >
                    Briši
                  </button>
                </div>
              </div>

              {expandedId === cat._id && cat.subcategories.length > 0 && (
                <div className="border-t border-slate-700 pt-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Podkategorije
                  </p>
                  {cat.subcategories.map((sub) => (
                    <div
                      key={sub.key}
                      className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-white">{sub.label}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {sub.key}
                      </span>
                      {sub.synonyms.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] bg-slate-600 text-slate-300 px-1 py-0.5 rounded"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h3 className="text-lg font-bold">
              {editCategory ? "Uredi kategoriju" : "Nova kategorija"}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Ključ (key)</label>
                  <input
                    className={inp}
                    placeholder="npr. nails"
                    value={form.key}
                    disabled={!!editCategory}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        key: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                      })
                    }
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Jedinstven, ne može se menjati
                  </p>
                </div>
                <div>
                  <label className={lbl}>Naziv (label)</label>
                  <input
                    className={inp}
                    placeholder="npr. Nokti"
                    value={form.label}
                    onChange={(e) =>
                      setForm({ ...form, label: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label className={lbl}>Sinonimi (razdvojeni zarezom)</label>
                <input
                  className={inp}
                  placeholder="npr. nokti, manikir, pedikir"
                  value={form.synonyms}
                  onChange={(e) =>
                    setForm({ ...form, synonyms: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Popularnost</label>
                  <input
                    type="number"
                    className={inp}
                    min={0}
                    value={form.popularityScore}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        popularityScore: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm({ ...form, isActive: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-300">Aktivna</span>
                  </label>
                </div>
              </div>

              {/* Subcategories */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={lbl}>Podkategorije</label>
                  <button
                    type="button"
                    onClick={addSubcategory}
                    className={btnGreen + " py-1 text-[11px]"}
                  >
                    + Dodaj
                  </button>
                </div>
                {form.subcategories.map((sub, i) => (
                  <div
                    key={i}
                    className="bg-slate-700/50 rounded-lg p-3 space-y-2"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className={inp + " text-xs"}
                        placeholder="key (npr. gel)"
                        value={sub.key}
                        onChange={(e) =>
                          updateSubcategory(
                            i,
                            "key",
                            e.target.value.toLowerCase().replace(/\s+/g, "-"),
                          )
                        }
                      />
                      <input
                        className={inp + " text-xs"}
                        placeholder="Naziv (npr. Gel lak)"
                        value={sub.label}
                        onChange={(e) =>
                          updateSubcategory(i, "label", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        className={inp + " text-xs flex-1"}
                        placeholder="Sinonimi, razdvojeni zarezom"
                        value={sub.synonyms}
                        onChange={(e) =>
                          updateSubcategory(i, "synonyms", e.target.value)
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeSubcategory(i)}
                        className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-slate-600 text-slate-300 text-xs font-semibold rounded-lg hover:border-slate-400 hover:text-white transition"
                >
                  Otkaži
                </button>
                <button type="submit" disabled={saving} className={btnPrimary}>
                  {saving ? "Čuvanje..." : editCategory ? "Sačuvaj" : "Kreiraj"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-white">Obriši kategoriju?</h3>
            <p className="text-sm text-slate-400">Ova akcija je nepovratna.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-slate-600 text-slate-300 text-xs font-semibold rounded-lg hover:border-slate-400 hover:text-white transition"
              >
                Otkaži
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className={btnDanger}
              >
                Obriši
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KorisniciTab() {
  const [users, setUsers] = useState<AuthUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editUser, setEditUser] = useState<AuthUserRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set("query", search);
      if (roleFilter !== "all") qs.set("role", roleFilter);
      const res = await api.get<AuthUserRow[]>(`/superadmin/auth-users?${qs}`);
      setUsers(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function openEdit(u: AuthUserRow) {
    setEditUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      phone: u.phone ?? "",
      role: u.role,
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditLoading(true);
    try {
      await api.patch(`/superadmin/auth-users/${editUser._id}`, editForm);
      setEditUser(null);
      fetchUsers();
    } catch {
      // silent
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const user = users.find((u) => u._id === id);
      const url = user?.isOrphan
        ? `/superadmin/auth-users/${id}?type=auth`
        : `/superadmin/auth-users/${id}`;
      await api.delete(url);
      setDeleteId(null);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch {
      // silent
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("sr-RS");
  }

  function formatRelative(iso: string | null) {
    if (!iso) return "—";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Upravo";
    if (mins < 60) return `pre ${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `pre ${hrs}h`;
    return formatDate(iso);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold">Korisnici ({users.length})</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            className={inp + " w-52"}
            placeholder="Pretraga po imenu ili emailu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={inp + " w-36"}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Sve role</option>
            <option value="OWNER">OWNER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="STAFF">STAFF</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-slate-400 py-8">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          Učitavanje...
        </div>
      )}

      {!loading && users.length === 0 && (
        <p className="text-slate-500 text-sm py-8 text-center">
          Nema korisnika.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-700 text-left">
              <th className="pb-2 pr-4 font-semibold">Korisnik</th>
              <th className="pb-2 pr-4 font-semibold">Salon</th>
              <th className="pb-2 pr-4 font-semibold">Rola</th>
              <th className="pb-2 pr-4 font-semibold">Status</th>
              <th className="pb-2 pr-4 font-semibold">Poslednja aktivnost</th>
              <th className="pb-2 pr-4 font-semibold">Registrovan</th>
              <th className="pb-2 font-semibold">Akcije</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((u) => (
              <tr
                key={u._id}
                className={`text-slate-300 hover:bg-slate-800/50 transition ${u.isOrphan ? "opacity-70" : ""}`}
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-white">{u.name || "—"}</p>
                    {u.isOrphan && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-400 border border-amber-700 uppercase tracking-wide">
                        Orphan
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500">{u.email}</p>
                  {u.phone && <p className="text-slate-600">{u.phone}</p>}
                  {u.isOrphan && (
                    <p className="text-[10px] text-amber-500/70 mt-0.5">
                      Nalog bez salona
                    </p>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <p className="font-medium">{u.tenantName}</p>
                  {u.tenantSlug && (
                    <p className="text-slate-500">{u.tenantSlug}</p>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <RoleBadge role={u.role} />
                </td>
                <td className="py-3 pr-4">
                  {u.isOrphan ? (
                    <span className="text-slate-600 text-[11px]">—</span>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${u.isOnline ? "bg-emerald-400" : "bg-slate-600"}`}
                        />
                        <span
                          className={
                            u.isOnline ? "text-emerald-400" : "text-slate-500"
                          }
                        >
                          {u.isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                      {!u.isEmailVerified && (
                        <span className="text-[10px] text-red-400 mt-0.5 block">
                          Email nepotvrđen
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className="py-3 pr-4 text-slate-400">
                  {formatRelative(u.lastActive)}
                </td>
                <td className="py-3 pr-4 text-slate-400">
                  {formatDate(u.createdAt)}
                </td>
                <td className="py-3">
                  <div className="flex gap-1.5">
                    {!u.isOrphan && (
                      <button
                        onClick={() => openEdit(u)}
                        className="px-2.5 py-1 bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg hover:bg-slate-600 transition"
                      >
                        Uredi
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteId(u._id)}
                      className="px-2.5 py-1 bg-red-900/50 text-red-400 text-[11px] font-semibold rounded-lg hover:bg-red-800/60 transition"
                    >
                      Obriši
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">
              Uredi korisnika
            </h3>
            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label className={lbl}>Ime</label>
                <input
                  className={inp}
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input
                  type="email"
                  className={inp}
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={lbl}>Telefon</label>
                <input
                  type="tel"
                  className={inp}
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, phone: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={lbl}>Rola</label>
                <select
                  className={inp}
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, role: e.target.value }))
                  }
                >
                  <option value="OWNER">OWNER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="STAFF">STAFF</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={editLoading}
                  className={btnPrimary}
                >
                  {editLoading ? "Čuvanje..." : "Sačuvaj"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 border border-slate-600 text-slate-400 text-xs font-bold rounded-lg hover:border-slate-400 transition"
                >
                  Otkaži
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              Potvrda brisanja
            </h3>
            <p className="text-slate-400 text-sm mb-5">
              Da li ste sigurni da želite da obrišete ovog korisnika? Akcija je
              nepovratna.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-slate-600 text-slate-400 text-xs font-bold rounded-lg hover:border-slate-400 transition"
              >
                Otkaži
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className={btnDanger}
              >
                Obriši
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Chat ────────────────────────────────────────────────────────────────
function ChatTab({
  tenants,
  selected,
  onSelect,
}: {
  tenants: TenantRow[];
  selected: TenantRow | null;
  onSelect: (t: TenantRow) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Chat sa vlasnicima salona</h2>
      <p className="text-slate-400 text-sm">
        Izaberite salon iz liste da otvorite razgovor sa vlasnikom.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-14rem)]">
        {/* Tenant list */}
        <div className={card + " overflow-y-auto"}>
          <h3 className="font-semibold text-sm mb-3 sticky top-0 bg-slate-800 pb-2">
            Saloni
          </h3>
          <div className="space-y-1">
            {tenants.map((t) => (
              <button
                key={t._id}
                onClick={() => onSelect(t)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  selected?._id === t._id
                    ? "bg-violet-700 text-white"
                    : "text-slate-300 hover:bg-slate-700"
                }`}
              >
                <p className="font-medium">{t.name}</p>
                <p className="text-xs opacity-70">{t.owner?.email ?? "—"}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className={card + " lg:col-span-2 flex flex-col overflow-hidden p-4"}>
          {selected ? (
            <SuperAdminChatWorkspace
              tenantId={selected._id}
              tenantName={selected.name}
              ownerEmail={selected.owner?.email}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              <div className="text-center">
                <ChatBubbleLeftRightIcon className="size-12 mx-auto mb-3 opacity-30" />
                <p>Izaberite salon iz liste</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
