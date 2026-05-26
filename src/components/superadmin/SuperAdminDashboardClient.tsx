// app/superadmin/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PLAN_FEATURES } from "@/lib/plans/planFeatures";
import { AuthStatusButton } from "@/components/auth/AuthStatusButton";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdminTenants } from "@/hooks/useSuperAdminTenants";
import type { TenantRow } from "@/hooks/useSuperAdminTenants";
import Link from "next/link";
import { SuperAdminNotificationBell } from "@/components/superadmin/SuperAdminNotificationBell";
import AdminNewsletterDashboard from "@/components/admin/AdminNewsletterDashboard";
import { ProfilTab as ProfilTabComponent } from "@/components/superadmin/tabs/ProfilTab";
import { ChatTab as ChatTabComponent } from "@/components/superadmin/tabs/ChatTab";
import { StatistikaTab as StatistikaTabComponent } from "@/components/superadmin/tabs/StatistikaTab";
import { PodesavanjaTab as PodesavanjaTabComponent } from "@/components/superadmin/tabs/PodesavanjaTab";
import { SaloniTab as SaloniTabComponent } from "@/components/superadmin/tabs/SaloniTab";
import { MarketingTab as MarketingTabComponent } from "@/components/superadmin/tabs/MarketingTab";
import { useSuperAdminTrialTab } from "@/hooks/useSuperAdminTrialTab";
import { useSuperAdminPlansTab } from "@/hooks/useSuperAdminPlansTab";
import { useSuperAdminCategories } from "@/hooks/useSuperAdminCategories";
import { useSuperAdminUsers } from "@/hooks/useSuperAdminUsers";
import type { SuperAdminTab } from "@/types/superadmin";
import {
  PlanBadge,
  StatusBadge,
  SUPERADMIN_TABS,
  superAdminCardClass as card,
  superAdminDangerButtonClass as btnDanger,
  superAdminGreenButtonClass as btnGreen,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
  superAdminPrimaryButtonClass as btnPrimary,
} from "@/components/superadmin/shared";

const today = Date.now();

// ─── Main dashboard ────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<SuperAdminTab>("saloni");
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white font-black text-lg shadow-lg">
              M
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Marysoll SuperAdmin
              </h1>
              <p className="text-xs text-violet-400 -mt-1">
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
          <SuperAdminNotificationBell
            onChatClick={() => setActiveTab("chat")}
          />
          <AuthStatusButton theme="dark" logoutRedirect="/login" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-56 bg-slate-800 border-r border-slate-700 flex-shrink-0 py-4">
          <ul className="space-y-0.5 px-2">
            {SUPERADMIN_TABS.map((t) => (
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
            <SaloniTabComponent
              superAdmin={sa}
              onSelect={setSelectedTenant}
              selectedId={selectedTenant?._id ?? null}
            />
          )}
          {activeTab === "trial" && <TrialTab sa={sa} tenants={sa.tenants} />}
          {activeTab === "planovi" && (
            <PlanoviTab sa={sa} tenants={sa.tenants} />
          )}
          {activeTab === "statistika" && (
            <StatistikaTabComponent stats={sa.stats} tenants={sa.tenants} />
          )}
          {activeTab === "korisnici" && <KorisniciTab />}
          {activeTab === "kategorije" && <KategorijeTab />}
          {activeTab === "podesavanja" && (
            <PodesavanjaTabComponent superAdmin={sa} />
          )}
          {activeTab === "profil" && <ProfilTabComponent />}
          {activeTab === "newsletter" && (
            <SuperAdminNewsletterTab
              tenants={sa.tenants}
              selected={selectedTenant}
              onSelect={setSelectedTenant}
            />
          )}
          {activeTab === "marketing" && <MarketingTabComponent />}
          {activeTab === "chat" && (
            <ChatTabComponent
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

function SuperAdminNewsletterTab({
  tenants,
  selected,
  onSelect,
}: {
  tenants: TenantRow[];
  selected: TenantRow | null;
  onSelect: (tenant: TenantRow) => void;
}) {
  const [mode, setMode] = useState<"platform" | "tenant">("platform");
  const activeScope =
    mode === "platform"
      ? ({ scope: "platform" } as const)
      : selected
        ? ({ scope: "tenant", tenantId: selected._id } as const)
        : undefined;

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-400">
              Newsletter
            </p>
            <h2 className="mt-1 text-lg font-bold">Newsletter dashboard</h2>
            <p className="mt-2 text-sm text-slate-400">
              Dva režima: salon newsletter za tenant kampanje i Marysoll
              platform newsletter za B2B kampanje prema salonima.
            </p>
          </div>
          <div className="grid w-full max-w-2xl gap-3 lg:grid-cols-[220px_1fr]">
            <div>
              <label className={lbl}>Režim</label>
              <select
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as "platform" | "tenant")
                }
                className={inp}
              >
                <option value="platform">Marysoll platform newsletter</option>
                <option value="tenant">Salon newsletter</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Salon</label>
              <select
                value={selected?._id ?? ""}
                disabled={mode === "platform"}
                onChange={(event) => {
                  const tenant = tenants.find(
                    (item) => item._id === event.target.value,
                  );
                  if (tenant) {
                    onSelect(tenant);
                  }
                }}
                className={inp}
              >
                <option value="">Izaberi salon...</option>
                {tenants.map((tenant) => (
                  <option key={tenant._id} value={tenant._id}>
                    {tenant.name} ({tenant.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {activeScope ? (
        <div className="rounded-2xl bg-slate-950/40 p-6 text-slate-100">
          <AdminNewsletterDashboard
            key={
              activeScope.scope === "platform"
                ? "platform"
                : `tenant-${activeScope.tenantId}`
            }
            scope={activeScope}
          />
        </div>
      ) : (
        <div className={card}>
          <p className="text-sm text-slate-400">
            Prvo izaberi salon da bi Superadmin radio nad istim tenant newsletter
            podacima kao admin/owner panel.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Trial ───────────────────────────────────────────────────────────────
const PRO_TRIAL_PRESET = Object.fromEntries(
  (Object.entries(PLAN_FEATURES.pro) as [string, unknown][]).filter(
    ([, v]) => !Array.isArray(v),
  ),
) as Partial<typeof PLAN_FEATURES.pro>;

const ENTERPRISE_TRIAL_PRESET = Object.fromEntries(
  (Object.entries(PLAN_FEATURES.enterprise) as [string, unknown][]).filter(
    ([, v]) => !Array.isArray(v),
  ),
) as Partial<typeof PLAN_FEATURES.enterprise>;

function TrialTab({
  sa,
  tenants,
}: {
  sa: ReturnType<typeof useSuperAdminTenants>;
  tenants: TenantRow[];
}) {
  const {
    selectedId,
    setSelectedId,
    days,
    setDays,
    selectedTenant: tenant,
    activateTrial,
    extendTrial,
    deactivateTrial,
    isUpdatingTrial,
  } = useSuperAdminTrialTab(sa, tenants);

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
              onClick={activateTrial}
              disabled={!selectedId || isUpdatingTrial}
              className={btnGreen}
            >
              {tenant?.isTrialActive ? "Restartuj trial" : "Aktiviraj trial"}
            </button>
            <button
              onClick={() =>
                selectedId && extendTrial(selectedId, parseInt(days) || 7)
              }
              disabled={!selectedId || isUpdatingTrial}
              className={btnPrimary}
            >
              Produži za {days || 7} dana
            </button>
            {tenant?.isTrialActive && (
              <button
                onClick={() => selectedId && deactivateTrial(selectedId)}
                disabled={isUpdatingTrial}
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
                  disabled={isUpdatingTrial}
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
  const {
    selectedId,
    setSelectedId,
    plan,
    setPlan,
    overrideEnabled,
    setOverrideEnabled,
    overrides,
    setOverrides,
    overrideExpiry,
    setOverrideExpiry,
    overrideNote,
    setOverrideNote,
    selectedTenant,
    toggleOverride,
    savePlan,
    setFeatureOverride,
    removeFeatureOverride,
    isUpdatingPlan,
    isSettingOverride,
    isRemovingOverride,
  } = useSuperAdminPlansTab(sa, tenants);

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
                onClick={savePlan}
                disabled={!selectedId || isUpdatingPlan}
                className={btnPrimary}
              >
                {isUpdatingPlan ? "Ažuriranje..." : "Sačuvaj plan"}
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
                          const isOn = !!(overrides as Record<string, unknown>)[keyStr];
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
                    onClick={setFeatureOverride}
                    disabled={
                      !Object.values(overrides).some(Boolean) ||
                      isSettingOverride
                    }
                    className={btnPrimary}
                  >
                    {isSettingOverride ? "Čuvanje..." : "Primeni override"}
                  </button>
                  <button
                    onClick={removeFeatureOverride}
                    disabled={isRemovingOverride}
                    className="px-4 py-2 border border-slate-600 text-slate-400 text-xs font-bold rounded-lg hover:border-red-600 hover:text-red-400 transition disabled:opacity-40"
                  >
                    {isRemovingOverride ? "..." : "Ukloni override"}
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
  const {
    categories,
    isLoading: loading,
    showForm,
    editCategory,
    form,
    setForm,
    deleteId,
    setDeleteId,
    expandedId,
    setExpandedId,
    isSaving: saving,
    openCreate,
    openEdit,
    closeForm,
    saveCategory,
    deleteCategory,
    toggleCategoryActive,
  } = useSuperAdminCategories();

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.key.trim() || !form.label.trim()) return;
    await saveCategory();
  }

  function handleDelete(id: string) {
    deleteCategory(id);
  }

  function toggleActive(cat: CategoryRow) {
    toggleCategoryActive(cat);
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
                  onClick={closeForm}
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
  const {
    users,
    isLoading: loading,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    editUser,
    setEditUser,
    editForm,
    setEditForm,
    deleteId,
    setDeleteId,
    openEdit,
    updateUser,
    isUpdatingUser: editLoading,
    deleteUser,
  } = useSuperAdminUsers();

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    await updateUser();
  }

  function handleDelete(id: string) {
    deleteUser(id);
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("sr-RS");
  }

  function formatRelative(iso: string | null) {
    if (!iso) return "—";
    const diff = today - new Date(iso).getTime();
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
