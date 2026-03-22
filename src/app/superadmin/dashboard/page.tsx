"use client";

import { useState, useMemo } from "react";
import { AuthStatusButton } from "@/components/auth/AuthStatusButton";
import {
  UsersIcon,
  ChartBarIcon,
  CreditCardIcon,
  CogIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useSuperAdminTenants } from "@/hooks/useSuperAdminTenants";
import type { TenantRow } from "@/hooks/useSuperAdminTenants";
import Image from "next/image";
import Link from "next/link";

// ─── Tab types ────────────────────────────────────────────────────────────────
type Tab =
  | "saloni"
  | "trial"
  | "planovi"
  | "statistika"
  | "podesavanja"
  | "chat";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "saloni", label: "Saloni", icon: UsersIcon },
  { id: "trial", label: "Trial period", icon: ShieldCheckIcon },
  { id: "planovi", label: "Planovi", icon: CreditCardIcon },
  { id: "statistika", label: "Statistika", icon: ChartBarIcon },
  { id: "podesavanja", label: "Podešavanja", icon: CogIcon },
  { id: "chat", label: "Chat", icon: ChatBubbleLeftRightIcon },
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

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div>
          <Link href="/" className="flex gap-2">
            <Image
              width={136}
              height={40}
              alt="Marysoll je napravila nešto posebno"
              src={"/marysoll-white-logo.svg"}
              className="h-10 w-auto object-contain"
            />
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
          {activeTab === "podesavanja" && <PodesavanjaTab sa={sa} />}
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
        {filtered.map((t) => (
          <div
            key={t._id}
            className={`${card} flex items-center gap-4 cursor-pointer hover:border-slate-500 transition ${
              selectedId === t._id
                ? "border-violet-500 ring-1 ring-violet-500/30"
                : ""
            }`}
            onClick={() => onSelect(t)}
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
                <span>{t.slug}</span>
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
            </div>
          </div>
        ))}

        {filtered.length === 0 && !sa.isLoading && (
          <p className="text-slate-500 text-sm py-8 text-center">
            Nema rezultata.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Trial ───────────────────────────────────────────────────────────────
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
  const trialTenants = tenants.filter((t) => t.isTrialActive);
  const expiredTrials = tenants.filter(
    (t) =>
      !t.isTrialActive && t.trialEndsAt && new Date(t.trialEndsAt) < new Date(),
  );

  return (
    <div className="space-y-6 max-w-3xl">
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
            <div>
              <label className={lbl}>Broj dana</label>
              <input
                type="number"
                className={inp}
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

  const PLAN_INFO = [
    {
      id: "free",
      label: "Free",
      price: "0 EUR",
      desc: "Osnovna funkcionalnost, trial period",
    },
    {
      id: "starter",
      label: "Starter",
      price: "19 EUR",
      desc: "Do 100 termina/mesečno, newsletter",
    },
    {
      id: "pro",
      label: "Pro",
      price: "49 EUR",
      desc: "Neograničeno, AI asistent, analitika",
    },
    {
      id: "enterprise",
      label: "Enterprise",
      price: "Po dogovoru",
      desc: "Custom integracije, prioritetna podrška",
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-lg font-bold">Upravljanje planovima</h2>

      {/* Plan cards */}
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

      {/* Change plan */}
      <div className={card}>
        <h3 className="font-semibold text-sm mb-4">Promeni plan za salon</h3>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Salon</label>
            <select
              className={inp}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">— Izaberite salon —</option>
              {tenants.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} — trenutno: {t.plan}
                </option>
              ))}
            </select>
          </div>
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
          <button
            onClick={() => selectedId && sa.setPlan(selectedId, plan)}
            disabled={!selectedId || sa.isUpdatingPlan}
            className={btnPrimary}
          >
            {sa.isUpdatingPlan ? "Ažuriranje..." : "Sačuvaj plan"}
          </button>
        </div>
      </div>

      {/* Payment modes */}
      <div className={card}>
        <h3 className="font-semibold text-sm mb-3">Načini plaćanja</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-700 rounded-xl p-4 border border-emerald-800/50">
            <h4 className="font-bold text-emerald-400 text-sm mb-2">
              🎁 Besplatan trial
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Korisnik registruje salon i dobija N dana besplatno{" "}
              <strong>bez unošenja kartice</strong>. Nakon isteka treba da plati
              ili gubi pristup.
            </p>
            <div className="text-xs text-emerald-300 space-y-1">
              <p>✓ Niža barijera za ulazak</p>
              <p>✓ Brži onboarding</p>
              <p>✗ Viši churn rate</p>
            </div>
          </div>
          <div className="bg-slate-700 rounded-xl p-4 border border-violet-800/50">
            <h4 className="font-bold text-violet-400 text-sm mb-2">
              💳 Kartica obavezna
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Korisnik unosi karticu pri registraciji,{" "}
              <strong>naplaćuje se</strong> ali dobija trial period gde može da
              dobije novac nazad (refund) ako nije zadovoljan.
            </p>
            <div className="text-xs text-violet-300 space-y-1">
              <p>✓ Viši intent (ozbiljniji korisnici)</p>
              <p>✓ Direktna naplata posle triala</p>
              <p>✗ Više trenja pri onboardingu</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Promenite aktivan mod u <strong>Podešavanja → Trial mod</strong>.
        </p>
      </div>
    </div>
  );
}

// ─── Tab: Statistika ──────────────────────────────────────────────────────────
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
    <div className="space-y-6 max-w-2xl">
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
        <div className={card + " lg:col-span-2 flex flex-col"}>
          {selected ? (
            <>
              <div className="flex items-center gap-3 pb-3 border-b border-slate-700 mb-4">
                <div>
                  <p className="font-semibold">{selected.name}</p>
                  <p className="text-xs text-slate-400">
                    {selected.owner?.email}
                  </p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                {/* Chat component integration point */}
                <div className="text-center">
                  <ChatBubbleLeftRightIcon className="size-12 mx-auto mb-3 opacity-30" />
                  <p>
                    Chat sa <strong>{selected.name}</strong>
                  </p>
                  <p className="text-xs mt-1 text-slate-600">
                    Tenant ID: {selected._id}
                  </p>
                  <p className="text-xs mt-3 text-slate-600">
                    Integrisati SuperAdminChat komponentu ovde.
                  </p>
                </div>
              </div>
            </>
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
