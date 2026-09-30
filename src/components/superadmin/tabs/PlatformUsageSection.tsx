"use client";

import toast from "react-hot-toast";
import {
  superAdminCardClass as card,
  superAdminPrimaryButtonClass as btnPrimary,
} from "@/components/superadmin/shared";
import { PLAN_DISPLAY_NAMES } from "@/lib/plans/planFeatures";
import { usePlatformUsage } from "@/hooks/usePlatformUsage";
import type { ResourceQuotaStatus } from "@/types/resource-quota";

function fmtMb(mb: number | null | undefined) {
  if (mb == null) return "—";
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb > 0 && mb < 1) return `${Math.round(mb * 1024)} KB`;
  return `${mb.toFixed(1)} MB`;
}

function fmtPercent(percent: number | null) {
  return percent == null ? "—" : `${percent.toFixed(1)}%`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sr-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  );
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
      <div
        className="h-full rounded-full bg-violet-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const STATUS_LABELS: Record<ResourceQuotaStatus, string> = {
  healthy: "Healthy",
  warning: "Upozorenje",
  limit_reached: "Kapacitet dostignut",
};

const STATUS_CLASSES: Record<ResourceQuotaStatus, string> = {
  healthy: "text-emerald-400",
  warning: "text-amber-400",
  limit_reached: "text-red-400",
};

export function PlatformUsageSection() {
  const { data, isError, refresh, calibrate } = usePlatformUsage();
  const usage = data?.usage;
  const mongo = usage?.mongodb ?? null;
  const cloud = usage?.cloudinary ?? null;
  const tenantUsage = usage?.tenantUsage ?? null;
  const calibration = usage?.calibration ?? null;
  const candidate = usage?.calibrationCandidate ?? null;
  const capacity = usage?.capacity;
  const m = mongo?.data;
  const c = cloud?.data;
  const mongoLimitMb = m?.storageLimitMb ?? 0;
  const cloudLimitGb = c?.storageLimitGb ?? 0;
  const mongoPercent =
    m && mongoLimitMb > 0 ? (m.storageUsedMb / mongoLimitMb) * 100 : null;
  const cloudPercent =
    c && cloudLimitGb > 0
      ? (c.storageUsedMb / (cloudLimitGb * 1024)) * 100
      : null;
  const tenantRows = tenantUsage?.data.tenants ?? [];

  function refreshUsage() {
    refresh.mutate(undefined, {
      onSuccess: () => toast.success("Potrošnja je osvežena."),
      onError: (error) => toast.error(error.message),
    });
  }

  function calibrateUsage() {
    const verb = calibration ? "ponovo kalibrišete" : "kalibrišete";
    if (
      !window.confirm(
        `Da li želite da ${verb} limite prema trenutno prikazanoj potrošnji The Lash Room?`,
      )
    ) {
      return;
    }
    calibrate.mutate(undefined, {
      onSuccess: () => toast.success("Resource quota kalibracija je sačuvana."),
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-white">Potrošnja resursa</h2>
          <p className="text-sm text-slate-400">
            Globalni kapacitet infrastrukture i tenant usage procene.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshUsage}
          disabled={refresh.isPending}
          className={btnPrimary}
        >
          {refresh.isPending ? "Osvežavanje..." : "Osveži potrošnju"}
        </button>
      </div>

      {(isError || refresh.isError) && (
        <div className={`${card} text-sm text-red-400`}>
          Potrošnja trenutno nije dostupna. Pokušajte ponovo.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={`${card} space-y-3`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-400">
              Platform infrastructure
            </p>
            <h3 className="mt-0.5 font-bold text-white">MongoDB Atlas</h3>
            <p className="text-xs text-slate-500">stvarni globalni storage</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-3xl font-black text-white">
              {fmtMb(m?.storageUsedMb)}
            </p>
            <UsageBar used={m?.storageUsedMb ?? 0} limit={mongoLimitMb} />
            <p className="text-xs text-slate-500">
              Fizički limit: {fmtMb(m?.storageLimitMb)}
            </p>
            <p className="text-xs text-slate-500">
              Iskorišćeno: {fmtPercent(mongoPercent)}
            </p>
          </div>
          <div className="space-y-1.5 border-t border-slate-700 pt-2">
            <MetricRow label="Connections" value={m?.connections ?? "—"} />
            <MetricRow
              label="CPU avg"
              value={m?.cpuAvgPercent == null ? "—" : `${m.cpuAvgPercent}%`}
            />
            <p className="text-[11px] text-slate-500">
              CPU metrika nije dostupna na trenutnom Atlas tier-u.
            </p>
            <MetricRow label="Collections" value={m?.collections ?? "—"} />
          </div>
          <p className="pt-1 text-xs text-slate-500">
            Ažurirano: {fmtDate(mongo?.syncedAt)}
          </p>
        </div>

        <div className={`${card} space-y-3`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-400">
              Platform infrastructure
            </p>
            <h3 className="mt-0.5 font-bold text-white">Cloudinary</h3>
            <p className="text-xs text-slate-500">stvarni provider storage</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-3xl font-black text-white">
              {fmtMb(c?.storageUsedMb)}
            </p>
            <UsageBar
              used={c?.storageUsedMb ?? 0}
              limit={cloudLimitGb * 1024}
            />
            <p className="text-xs text-slate-500">
              Provider limit: {c ? `${cloudLimitGb} GB` : "—"}
            </p>
            <p className="text-xs text-slate-500">
              Iskorišćeno: {fmtPercent(cloudPercent)}
            </p>
          </div>
          <div className="space-y-1.5 border-t border-slate-700 pt-2">
            <MetricRow label="Assets" value={c?.assets ?? "—"} />
            <MetricRow
              label="Bandwidth"
              value={c ? `${c.bandwidthGb} GB` : "—"}
            />
            <MetricRow
              label="Transformations"
              value={c?.transformations ?? "—"}
            />
          </div>
          <p className="pt-1 text-xs text-slate-500">
            Ažurirano: {fmtDate(cloud?.syncedAt)}
          </p>
        </div>
      </div>

      <div className={`${card} space-y-4`}>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h3 className="font-semibold text-white">Capacity model</h3>
            <p className="text-xs text-slate-400">
              Heuristika kapaciteta prema veličini The Lash Room, sa rezervom od
              20%.
            </p>
          </div>
          <button
            type="button"
            onClick={calibrateUsage}
            disabled={!candidate || calibrate.isPending}
            className={btnPrimary}
          >
            {calibrate.isPending
              ? "Čuvanje..."
              : calibration
                ? "Ponovo kalibriši prema The Lash Room"
                : "Kalibriši prema The Lash Room"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-700 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sačuvani calibration baseline
            </p>
            {calibration ? (
              <div className="mt-2 space-y-1.5">
                <p className="font-semibold text-white">
                  {calibration.sourceTenantName}
                </p>
                <MetricRow
                  label="MongoDB estimate"
                  value={fmtMb(calibration.mongoMb)}
                />
                <MetricRow
                  label="Cloudinary"
                  value={fmtMb(calibration.cloudinaryMb)}
                />
                <MetricRow
                  label="Captured"
                  value={fmtDate(calibration.capturedAt)}
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-amber-400">
                Kalibracija još nije sačuvana.
              </p>
            )}
          </div>
          <div className="rounded-lg border border-slate-700 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Trenutni kandidat iz snapshot-a
            </p>
            {candidate ? (
              <div className="mt-2 space-y-1.5">
                <p className="font-semibold text-white">{candidate.name}</p>
                <MetricRow
                  label="MongoDB estimate"
                  value={fmtMb(candidate.mongoMb)}
                />
                <MetricRow
                  label="Cloudinary"
                  value={fmtMb(candidate.cloudinaryMb)}
                />
                <MetricRow
                  label="Snapshot"
                  value={fmtDate(candidate.snapshotSyncedAt)}
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Osvežite potrošnju da biste dobili kandidat.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-slate-700 pt-4 sm:grid-cols-3">
          <MetricRow
            label="Mongo safe capacity"
            value={
              capacity?.mongoAnjaEquivalentCapacity == null
                ? "—"
                : `≈ ${capacity.mongoAnjaEquivalentCapacity} salona`
            }
          />
          <MetricRow
            label="Cloudinary safe capacity"
            value={
              capacity?.cloudinaryAnjaEquivalentCapacity == null
                ? "—"
                : `≈ ${capacity.cloudinaryAnjaEquivalentCapacity} salona`
            }
          />
          <MetricRow
            label="Efektivni safe capacity"
            value={
              capacity?.platformAnjaEquivalentCapacity == null
                ? "—"
                : `≈ ${capacity.platformAnjaEquivalentCapacity} ekvivalenata`
            }
          />
          <MetricRow
            label="Bottleneck"
            value={
              capacity?.bottleneck === "mongodb"
                ? "MongoDB"
                : capacity?.bottleneck === "cloudinary"
                  ? "Cloudinary"
                  : "—"
            }
          />
          <MetricRow
            label="Mongo current usage"
            value={
              capacity?.mongoCurrentAnjaEquivalents == null
                ? "—"
                : `≈ ${capacity.mongoCurrentAnjaEquivalents.toFixed(1)} ekvivalenata`
            }
          />
          <MetricRow
            label="Cloudinary current usage"
            value={
              capacity?.cloudinaryCurrentAnjaEquivalents == null
                ? "—"
                : `≈ ${capacity.cloudinaryCurrentAnjaEquivalents.toFixed(1)} ekvivalenata`
            }
          />
        </div>
      </div>

      <div className={card}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">Potrošnja po salonima</h3>
            <p className="text-xs text-slate-500">
              Mongo je procena po tenant dokumentima; nije byte-perfect billing
              usage.
            </p>
          </div>
          {tenantUsage && (
            <span className="text-right text-xs text-slate-500">
              Tenant DB estimates {fmtMb(tenantUsage.data.totalDbEstimateMb)} ·
              Media {fmtMb(tenantUsage.data.totalMediaMb)}
            </span>
          )}
        </div>
        {tenantRows.length === 0 ? (
          <p className="py-2 text-sm text-slate-500">
            Nema podataka. Kliknite „Osveži potrošnju“.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-slate-500">
                  <th className="pb-2 text-left font-semibold">Salon</th>
                  <th className="pb-2 text-left font-semibold">Plan</th>
                  <th className="pb-2 text-right font-semibold">Mongo</th>
                  <th className="pb-2 text-right font-semibold">Mongo quota</th>
                  <th className="pb-2 text-right font-semibold">Mongo %</th>
                  <th className="pb-2 text-right font-semibold">Cloudinary</th>
                  <th className="pb-2 text-right font-semibold">
                    Cloudinary quota
                  </th>
                  <th className="pb-2 text-right font-semibold">
                    Cloudinary %
                  </th>
                  <th className="pb-2 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tenantRows.map((tenant) => (
                  <tr key={tenant.tenantId} className="text-slate-300">
                    <td className="py-2 font-medium">
                      {tenant.name}
                      <span className="ml-1 text-slate-500">
                        ({tenant.slug})
                      </span>
                    </td>
                    <td className="py-2">{PLAN_DISPLAY_NAMES[tenant.plan]}</td>
                    <td className="py-2 text-right">
                      {fmtMb(tenant.dbEstimateMb)}
                    </td>
                    <td className="py-2 text-right">
                      {fmtMb(tenant.quotas.mongoStorageMb)}
                    </td>
                    <td className="py-2 text-right">
                      {fmtPercent(tenant.mongoPercent)}
                    </td>
                    <td className="py-2 text-right">{fmtMb(tenant.mediaMb)}</td>
                    <td className="py-2 text-right">
                      {fmtMb(tenant.quotas.cloudinaryStorageMb)}
                    </td>
                    <td className="py-2 text-right">
                      {fmtPercent(tenant.cloudinaryPercent)}
                    </td>
                    <td
                      className={`py-2 text-right font-semibold ${tenant.status ? STATUS_CLASSES[tenant.status] : "text-slate-500"}`}
                    >
                      {tenant.status
                        ? STATUS_LABELS[tenant.status]
                        : "Nije kalibrisano"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
