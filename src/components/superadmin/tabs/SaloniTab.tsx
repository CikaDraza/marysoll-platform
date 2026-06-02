"use client";

import { useEffect, useMemo, useState } from "react";
import AlertModal from "@/components/modals/AlertModal";
import { SuperAdminSalonGeoLocationPanel } from "@/components/superadmin/SuperAdminSalonGeoLocationPanel";
import {
  PlanBadge,
  StatusBadge,
  superAdminCardClass as card,
  superAdminDangerButtonClass as btnDanger,
  superAdminGreenButtonClass as btnGreen,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
  superAdminPrimaryButtonClass as btnPrimary,
} from "@/components/superadmin/shared";
import type { TenantRow } from "@/hooks/useSuperAdminTenants";
import type { useSuperAdminTenants } from "@/hooks/useSuperAdminTenants";
import { useSuperAdminMarketplaceBulk } from "@/hooks/useSuperAdminMarketplaceBulk";

interface SalonIdentityPanelProps {
  tenant: TenantRow;
  superAdmin: ReturnType<typeof useSuperAdminTenants>;
}

function SalonIdentityPanel({
  tenant,
  superAdmin,
}: SalonIdentityPanelProps) {
  const [form, setForm] = useState({
    slug: tenant.slug,
    customDomain: tenant.customDomain ?? "",
    cloudinaryFolder: tenant.cloudinaryFolder,
  });

  useEffect(() => {
    async function handleFormUpdate() {
      setForm({
        slug: tenant.slug,
        customDomain: tenant.customDomain ?? "",
        cloudinaryFolder: tenant.cloudinaryFolder,
      });
    }
    handleFormUpdate();
  }, [tenant.slug, tenant.customDomain, tenant.cloudinaryFolder]);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    superAdmin.updateIdentity(tenant._id, {
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
      <div>
        <label className={lbl}>Slug</label>
        <input
          className={inp + " font-mono"}
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          placeholder="ime-salona"
        />
        <p className="mt-1 text-[10px] text-slate-500">
          Subdomen:{" "}
          <span className="text-slate-300 font-mono">
            {form.slug || "—"}.marysoll.com
          </span>
        </p>
      </div>

      <div>
        <label className={lbl}>Custom domen</label>
        <input
          className={inp + " font-mono"}
          value={form.customDomain}
          onChange={(e) =>
            setForm((f) => ({ ...f, customDomain: e.target.value }))
          }
          placeholder="salon.rs (bez https://)"
        />
        <p className="mt-1 text-[10px] text-slate-500">
          Ostavite prazno da biste uklonili custom domen.
        </p>
      </div>

      <div className="sm:col-span-2">
        <label className={lbl}>Cloudinary folder</label>
        <input
          className={inp + " font-mono"}
          value={form.cloudinaryFolder}
          onChange={(e) =>
            setForm((f) => ({ ...f, cloudinaryFolder: e.target.value }))
          }
          placeholder="salons/salon-ime"
        />
      </div>

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
          disabled={superAdmin.isUpdatingIdentity}
          className={btnPrimary}
        >
          {superAdmin.isUpdatingIdentity ? "Čuvam..." : "Sačuvaj"}
        </button>
      </div>
    </div>
  );
}

interface SaloniTabProps {
  superAdmin: ReturnType<typeof useSuperAdminTenants>;
  onSelect: (tenant: TenantRow) => void;
  selectedId: string | null;
}

export function SaloniTab({
  superAdmin,
  onSelect,
  selectedId,
}: SaloniTabProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<TenantRow | null>(null);
  const [demoTarget, setDemoTarget] = useState<TenantRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return superAdmin.tenants.filter((tenant) => {
      const searchTerm = search.toLowerCase();
      const matchSearch =
        !search ||
        tenant.name.toLowerCase().includes(searchTerm) ||
        tenant.owner?.email.toLowerCase().includes(searchTerm) ||
        tenant.slug.includes(searchTerm);
      const matchStatus =
        filterStatus === "all" || tenant.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [superAdmin.tenants, search, filterStatus]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const bulk = useSuperAdminMarketplaceBulk();
  const filteredTenantIds = useMemo(
    () => filtered.map((t) => t._id),
    [filtered],
  );

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

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Marketplace ({filtered.length} prikazano)
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => bulk.enable(filteredTenantIds)}
            disabled={bulk.isPending || filteredTenantIds.length === 0}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-40"
          >
            Omogući prikazane
          </button>
          <button
            type="button"
            onClick={() => bulk.disable(filteredTenantIds)}
            disabled={bulk.isPending || filteredTenantIds.length === 0}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-red-600 hover:text-red-400 disabled:opacity-40"
          >
            Onemogući prikazane
          </button>
          <button
            type="button"
            onClick={() => bulk.backfill()}
            disabled={bulk.isPending}
            title="Jednokratno: omogući sve postojeće salone koji još nemaju marketplace podešavanje."
            className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-violet-600 disabled:opacity-40"
          >
            Backfill postojeće
          </button>
        </div>
      </div>

      {superAdmin.isLoading && (
        <div className="flex items-center gap-2 text-slate-400 py-8">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          Učitavanje...
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((tenant) => {
          const isExpanded = expandedId === tenant._id;
          return (
            <div
              key={tenant._id}
              className={`${card} transition ${
                selectedId === tenant._id
                  ? "border-violet-500 ring-1 ring-violet-500/30"
                  : "hover:border-slate-500"
              }`}
            >
              <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => {
                  onSelect(tenant);
                  toggleExpand(tenant._id);
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">
                      {tenant.name}
                    </span>
                    <StatusBadge status={tenant.status} />
                    <PlanBadge plan={tenant.plan} />
                    {tenant.isDemo && (
                      <span className="text-[10px] bg-amber-900/60 text-amber-300 border border-amber-600 px-2 py-0.5 rounded-full font-bold">
                        DEMO
                      </span>
                    )}
                    {tenant.isTrialActive && (
                      <span className="text-[10px] bg-amber-900/60 text-amber-400 border border-amber-700 px-2 py-0.5 rounded-full font-bold">
                        TRIAL {tenant.trialDaysLeft}d
                      </span>
                    )}
                    {!tenant.owner?.isEmailVerified && (
                      <span className="text-[10px] bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full">
                        Email nepotvrđen
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-slate-400">
                    <span className="font-mono">{tenant.slug}</span>
                    <span>{tenant.owner?.email ?? "—"}</span>
                    <span>{tenant.owner?.name ?? "—"}</span>
                    <span>
                      {new Date(tenant.createdAt).toLocaleDateString("sr-RS")}
                    </span>
                  </div>
                </div>

                <div
                  className="flex gap-2 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">
                      salon je:
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDemoTarget(tenant);
                      }}
                      disabled={superAdmin.isUpdatingDemo}
                      className={
                        tenant.isDemo
                          ? "px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-500 transition disabled:opacity-40"
                          : "px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.5)] hover:bg-emerald-400 transition disabled:opacity-40"
                      }
                    >
                      {tenant.isDemo ? "Demo ✓" : "Live ✓"}
                    </button>
                  </div>
                  {tenant.status !== "active" && (
                    <button
                      onClick={() => superAdmin.setStatus(tenant._id, "active")}
                      disabled={superAdmin.isUpdatingStatus}
                      className={btnGreen}
                    >
                      Aktiviraj
                    </button>
                  )}
                  {tenant.status === "active" && (
                    <button
                      onClick={() =>
                        superAdmin.setStatus(tenant._id, "suspended")
                      }
                      disabled={superAdmin.isUpdatingStatus}
                      className={btnDanger}
                    >
                      Suspenduj
                    </button>
                  )}
                  {!tenant.isTrialActive && (
                    <button
                      onClick={() => superAdmin.activateTrial(tenant._id, 30)}
                      disabled={superAdmin.isUpdatingTrial}
                      className={btnPrimary}
                    >
                      Trial 30d
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(tenant);
                    }}
                    disabled={superAdmin.isDeletingTenant}
                    className={btnDanger}
                  >
                    Obriši
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(tenant._id);
                    }}
                    className="px-2 py-2 text-slate-400 hover:text-white transition"
                    title={isExpanded ? "Zatvori" : "Otvori podešavanja"}
                  >
                    {isExpanded ? "▲" : "▼"}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <>
                  <SalonIdentityPanel
                    tenant={tenant}
                    superAdmin={superAdmin}
                  />
                  <div
                    className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SuperAdminSalonGeoLocationPanel tenantId={tenant._id} />
                  </div>
                </>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && !superAdmin.isLoading && (
          <p className="text-slate-500 text-sm py-8 text-center">
            Nema rezultata.
          </p>
        )}
      </div>

      <AlertModal
        open={!!deleteTarget}
        setOpen={(value) => {
          if (!value) setDeleteTarget(null);
        }}
        title="Trajno brisanje salona"
        message={`Da li ste sigurni da želite trajno obrisati salon "${deleteTarget?.name}"? Ova akcija će obrisati sve podatke salona i ne može se opozvati.`}
        onConfirm={() => {
          if (deleteTarget) {
            superAdmin.deleteTenant(deleteTarget._id);
            setDeleteTarget(null);
          }
        }}
      />

      <AlertModal
        open={!!demoTarget}
        setOpen={(value) => {
          if (!value) setDemoTarget(null);
        }}
        title={demoTarget?.isDemo ? "Označi kao live" : "Označi kao demo"}
        message={
          demoTarget?.isDemo
            ? `Označiti salon "${demoTarget?.name}" kao live? Live saloni su vidljivi u marketplace-u (booking.marysoll.com).`
            : `Označiti salon "${demoTarget?.name}" kao demo? Demo saloni su sakriveni iz marketplace-a (booking.marysoll.com).`
        }
        onConfirm={() => {
          if (demoTarget) {
            superAdmin.setDemo(demoTarget._id, !demoTarget.isDemo);
            setDemoTarget(null);
          }
        }}
      />
    </div>
  );
}
