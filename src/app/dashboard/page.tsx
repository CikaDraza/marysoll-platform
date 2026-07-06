// app/dashboard/page.tsx
"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { readCheckoutIntent, clearCheckoutIntent } from "@/lib/checkoutIntent";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import { useSalonProfileAdmin } from "@/hooks/useSalonProfileAdmin";
import { useAdminServices } from "@/hooks/useAdminServices";
import { FeatureGate } from "@/components/shared/FeatureGate";
import DashboardLayout from "@/layout/DashboardLayout";
import Loader from "@/components/elements/Loader";
import { api } from "@/lib/api";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import {
  ProfilTab,
  RadnoVremeTab,
  SocialSeoTab,
  UslugeTab,
} from "@/components/admin/dashboard/tabs";
import {
  MANUAL_DAYS_AHEAD,
  dayOffsetFromToday,
  upcomingDateKeys,
} from "@/components/admin/dashboard/shared";
import type { SeoAnalysisResult } from "@/components/admin/dashboard/shared";
import type { DashboardTabProps } from "@/components/admin/dashboard/types";

// ─── Tab komponente: lenjo učitavanje (code-splitting) ────────────────────────
// Statički import svih tabova pravio je ogroman inicijalni bundle koji se
// parsira/izvršava odmah — dovoljno da WebKit na iOS-u ubije stranicu
// ("This page couldn't load"). Svaki tab se sada učitava tek kad se otvori.
const TabLoader = () => <Loader />;

const AdminAppointments = dynamic(
  () => import("@/components/admin/AdminAppointments"),
  { ssr: false, loading: TabLoader },
);
const AdminTestimonials = dynamic(
  () => import("@/components/admin/AdminTestimonials"),
  { ssr: false, loading: TabLoader },
);
const AppointmentAdminCalendar = dynamic(
  () => import("@/components/admin/AppointmentAdminCalendar"),
  { ssr: false, loading: TabLoader },
);
const StatisticsPage = dynamic(
  () => import("@/components/admin/statistics/StatisticPage"),
  { ssr: false, loading: TabLoader },
);
const AdminNewsletterDashboard = dynamic(
  () => import("@/components/admin/AdminNewsletterDashboard"),
  { ssr: false, loading: TabLoader },
);
const EmailCampaignAIGenerator = dynamic(
  () =>
    import("@/components/email-campaign/EmailCampaignAIGenerator").then(
      (m) => m.EmailCampaignAIGenerator,
    ),
  { ssr: false, loading: TabLoader },
);
const AdminLandingCMS = dynamic(
  () =>
    import("@/components/admin/cms/AdminLandingCMS").then(
      (m) => m.AdminLandingCMS,
    ),
  { ssr: false, loading: TabLoader },
);
const AdminChat = dynamic(
  () => import("@/components/admin/chat/AdminChat").then((m) => m.AdminChat),
  { ssr: false, loading: TabLoader },
);
const ClientsList = dynamic(() => import("@/components/admin/ClientsList"), {
  ssr: false,
  loading: TabLoader,
});
const AdminGrowthStudio = dynamic(
  () => import("@/components/admin/loyalty/AdminGrowthStudio"),
  { ssr: false, loading: TabLoader },
);
const ServiceModal = dynamic(
  () =>
    import("@/components/admin/ServiceModal").then((m) => m.ServiceModal),
  { ssr: false, loading: TabLoader },
);
const AdminCustomDomain = dynamic(
  () =>
    import("@/components/admin/AdminCustomDomain").then(
      (m) => m.AdminCustomDomain,
    ),
  { ssr: false, loading: TabLoader },
);
const AdminPlanStatus = dynamic(
  () =>
    import("@/components/admin/plan/AdminPlanStatus").then(
      (m) => m.AdminPlanStatus,
    ),
  { ssr: false, loading: TabLoader },
);
const NotificationSettings = dynamic(
  () => import("@/components/settings/NotificationSettings"),
  { ssr: false, loading: TabLoader },
);

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
  | "growth"
  | "chat"
  | "pretplata"
  | "notifikacije";

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
  "growth",
  "chat",
  "pretplata",
  "notifikacije",
];

// ─── Manual slots (availabilityMode === "manualSlots") helpers ─────────────────


// ─── Main ─────────────────────────────────────────────────────────────────────

function AdminDashboard() {
  const searchParams = useSearchParams();

  // Tab je izveden DIREKTNO iz URL-a (jedini izvor istine) — bez lokalnog
  // state-a i efekta koji su kasnili/racirali pri brzoj promeni tabova.
  const tabParam = searchParams.get("tab") as Tab | null;
  const tab: Tab =
    tabParam && ALL_TABS.includes(tabParam) ? tabParam : "profil";

  const [confirmDeleteSalon, setConfirmDeleteSalon] = useState(false);
  const [deleteSalonInput, setDeleteSalonInput] = useState("");
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteAccountInput, setDeleteAccountInput] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const notifLogoRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  // All hooks before early return
  const { user, token, logout, isLoading: authLoading } = useAuth();

  // Checkout intent iz marketing/pricing-a: anoniman posetilac je izabrao plaćeni
  // plan pa se u međuvremenu ulogovao/registrovao. Odvedi ga na Pretplatu i
  // automatski otvori checkout za taj plan (intent živi u .marysoll.com cookie-ju).
  useEffect(() => {
    const intent = readCheckoutIntent();
    if (!intent) return;
    // Guard protiv petlje: ako smo već na pretplati sa startCheckout-om, ne diraj.
    if (tab === "pretplata" && searchParams.get("startCheckout")) return;
    clearCheckoutIntent();
    router.replace(`/dashboard?tab=pretplata&startCheckout=${intent}#planovi`);
  }, [tab, searchParams, router]);

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
  const [metadataSeoResult, setMetadataSeoResult] =
    useState<SeoAnalysisResult | null>(null);
  const [showMetadataSeoPanel, setShowMetadataSeoPanel] = useState(false);
  const [isAnalyzingMetadataSeo, setIsAnalyzingMetadataSeo] = useState(false);
  const [isAutoFixingMetadataSeo, setIsAutoFixingMetadataSeo] = useState(false);

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
  const hasProfile = !!sp.profile;

  // Ručni termini: koliko dana unapred prikazati u editoru (proširivo "+ Dodaj dan").
  const [manualDaysCount, setManualDaysCount] = useState(MANUAL_DAYS_AHEAD);
  // Uvek pokrij i najdalji datum koji već ima termine (npr. učitan iz baze).
  // Clamp na 2 godine: korumpiran/dalek datum-ključ u manualSlots bi inače
  // naterao upcomingDateKeys da alocira milione stavki → OOM/crash stranice.
  const MANUAL_OFFSET_CAP = 730;
  const manualFurthestOffset = Math.min(
    MANUAL_OFFSET_CAP,
    Object.keys(sp.form.manualSlots ?? {}).reduce(
      (max, k) => Math.max(max, dayOffsetFromToday(k)),
      -1,
    ),
  );
  const manualDateKeys = upcomingDateKeys(
    Math.max(manualDaysCount, manualFurthestOffset + 1),
  );

  const buildMetadataSeoContext = () => ({
    salon: {
      name: sp.form.name,
      city: sp.form.city,
      street: sp.form.street,
    },
    services: svc.services.map((service) => {
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
      };
    }),
  });

  const handleSaveMetadataSeo = () => {
    sp.save(undefined, {
      onSuccess: () => {
        setMetadataSeoResult(null);
        setShowMetadataSeoPanel(true);
      },
    });
  };

  const runMetadataSeoAnalysis = async () => {
    if (!token) {
      alert("Niste prijavljeni.");
      return;
    }
    setIsAnalyzingMetadataSeo(true);
    try {
      const res = await fetch("/api/salon-profile/seo-metadata-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          seo: sp.form.seo,
          seoContext: buildMetadataSeoContext(),
        }),
      });
      if (!res.ok) throw new Error("SEO analiza neuspešna");
      const data = (await res.json()) as SeoAnalysisResult;
      setMetadataSeoResult(data);
      setShowMetadataSeoPanel(true);
    } catch {
      alert("SEO analiza nije uspela");
    } finally {
      setIsAnalyzingMetadataSeo(false);
    }
  };

  const handleMetadataSeoAutoFix = async () => {
    if (!token || !metadataSeoResult) return;
    setIsAutoFixingMetadataSeo(true);
    try {
      const res = await fetch("/api/salon-profile/seo-metadata-auto-fix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          seo: sp.form.seo,
          seoResult: metadataSeoResult,
          seoContext: buildMetadataSeoContext(),
        }),
      });
      if (!res.ok) throw new Error("Auto-fix neuspešan");
      const data = (await res.json()) as {
        seo: Record<string, string | undefined>;
      };
      (
        [
          "homeTitle",
          "homeDescription",
          "uslugeTitle",
          "uslugeDescription",
          "terminiTitle",
          "terminiDescription",
        ] as const
      ).forEach((key) => {
        sp.setSeoField(key, data.seo[key] ?? "");
      });
      alert("SEO metadata je poboljšan. Kliknite Sačuvaj SEO da primenite.");
    } catch {
      alert("Auto-fix nije uspeo");
    } finally {
      setIsAutoFixingMetadataSeo(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || (!user.isAdmin && !user.isSuperAdmin))) {
      window.location.replace("/login");
    }
  }, [authLoading, user]);

  if (authLoading || !user || (!user.isAdmin && !user.isSuperAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/marysoll_elegant_logo.png"
            alt="Marysoll logo"
            width={40}
            height={40}
            className="rounded-2xl"
            priority
          />
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
            Provera pristupa...
          </div>
        </div>
      </div>
    );
  }

  const tabProps: DashboardTabProps = {
    sp, svc, hasProfile, user, token, tenant,
    updateIdentity, isUpdatingIdentity, isOwner,
    identityOpen, setIdentityOpen, identityForm, setIdentityForm,
    confirmDeleteSalon, setConfirmDeleteSalon, deleteSalonInput, setDeleteSalonInput,
    showDeleteAccount, setShowDeleteAccount, deleteAccountInput, setDeleteAccountInput,
    isDeletingAccount, fileRef, notifLogoRef,
    pwForm, setPwForm, pwLoading, pwError,
    handlePasswordChange, handleDeleteAccount, handleSaveWithAccount,
    metadataSeoResult, setMetadataSeoResult, showMetadataSeoPanel, setShowMetadataSeoPanel,
    isAnalyzingMetadataSeo, isAutoFixingMetadataSeo,
    runMetadataSeoAnalysis, handleMetadataSeoAutoFix, handleSaveMetadataSeo,
    manualDaysCount, setManualDaysCount, manualDateKeys,
  };

  return (
    <DashboardLayout>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-5">
          {sp.logoPreview ? (
            <Image
              src={sp.logoPreview}
              alt="logo"
              width={64}
              height={64}
              className="w-16 h-16 rounded-xl object-contain"
            />
          ) : (
            <Image
              src={"/image_missing.png"}
              alt="logo"
              width={64}
              height={64}
              className="w-16 h-16 bg-white rounded-xl p-2 object-contain"
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
      {/* ═══ TAB: Profil ════════════════════════════════════════════ */}
      {tab === "profil" && <ProfilTab {...tabProps} />}

      {/* ═══ TAB: Radno vreme ═══════════════════════════════════════ */}
      {tab === "radno-vreme" && <RadnoVremeTab {...tabProps} />}

      {/* ═══ TAB: Social & SEO ══════════════════════════════════════ */}
      {tab === "social-seo" && <SocialSeoTab {...tabProps} />}
      {tab === "cms" && <AdminLandingCMS sp={sp} />}

      {/* ═══ TAB: Usluge ════════════════════════════════════════════ */}
      {/* ═══ TAB: Usluge ════════════════════════════════════════════ */}
      {tab === "usluge" && <UslugeTab {...tabProps} />}
      {tab === "termini" && <AdminAppointments />}
      {tab === "kalendar" && <AppointmentAdminCalendar />}
      {tab === "statistika" && (
        <FeatureGate feature="statistics">
          <StatisticsPage />
        </FeatureGate>
      )}
      {tab === "newsletter" && (
        <FeatureGate feature="newsletterCampaigns">
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
      {tab === "growth" && (
        <FeatureGate feature="loyaltyCore">
          <AdminGrowthStudio />
        </FeatureGate>
      )}
      {tab === "chat" && <AdminChat />}
      {tab === "pretplata" && <AdminPlanStatus />}
      {tab === "notifikacije" && <NotificationSettings />}

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
