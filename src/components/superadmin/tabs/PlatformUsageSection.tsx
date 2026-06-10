"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  superAdminCardClass as card,
  superAdminPrimaryButtonClass as btnPrimary,
} from "@/components/superadmin/shared";

// ─── Tipovi (ogledaju shape iz lib/superadmin/platformUsage.ts) ──────────────
interface MongoUsageData {
  storageUsedMb: number;
  storageLimitMb: number;
  connections: number | null;
  cpuAvgPercent: number | null;
  collections: number;
}
interface CloudinaryUsageData {
  storageUsedMb: number;
  storageLimitGb: number;
  assets: number;
  bandwidthGb: number;
  transformations: number;
  requests: number | null;
}
interface TenantUsageRow {
  tenantId: string;
  name: string;
  slug: string;
  dbEstimateMb: number;
  mediaMb: number;
}
interface TenantUsageData {
  tenants: TenantUsageRow[];
  totalDbEstimateMb: number;
  totalMediaMb: number;
  topByDb: { name: string; dbEstimateMb: number } | null;
  topByMedia: { name: string; mediaMb: number } | null;
}
interface PlatformUsageResponse {
  success: boolean;
  usage: {
    mongodb: { data: MongoUsageData; syncedAt: string } | null;
    cloudinary: { data: CloudinaryUsageData; syncedAt: string } | null;
    tenantUsage: { data: TenantUsageData; syncedAt: string } | null;
  };
}

// Fallback limiti dok ne postoji prvi snapshot (poklapaju default-e u servisu).
const MONGO_LIMIT_MB_FALLBACK = 512;
const CLOUD_LIMIT_GB_FALLBACK = 25;

// ─── Helperi za prikaz ───────────────────────────────────────────────────────
function fmtMb(mb: number | null | undefined) {
  if (mb == null) return "—";
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb > 0 && mb < 1) return `${Math.round(mb * 1024)} KB`;
  return `${mb.toFixed(1)} MB`;
}
function fmtLimitMb(mb: number) {
  if (mb >= 1024) return `${Math.round(mb / 1024)} GB`;
  return `${mb} MB`;
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
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  return (
    <div className="bg-slate-700 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-violet-500 rounded-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function PlatformUsageSection() {
  const qc = useQueryClient();

  const { data, isError } = useQuery<PlatformUsageResponse>({
    queryKey: ["platform-usage"],
    queryFn: async () => {
      const res = await fetch("/api/superadmin/platform-usage");
      if (!res.ok) throw new Error("Greška");
      return res.json() as Promise<PlatformUsageResponse>;
    },
    staleTime: 60_000,
  });

  const refresh = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/superadmin/platform-usage/refresh", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Greška pri osvežavanju");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-usage"] }),
  });

  const mongo = data?.usage.mongodb ?? null;
  const cloud = data?.usage.cloudinary ?? null;
  const tenantUsage = data?.usage.tenantUsage ?? null;

  const m = mongo?.data;
  const c = cloud?.data;
  const mongoLimitMb = m?.storageLimitMb ?? MONGO_LIMIT_MB_FALLBACK;
  const cloudLimitGb = c?.storageLimitGb ?? CLOUD_LIMIT_GB_FALLBACK;
  const tenantRows = tenantUsage?.data.tenants ?? [];

  return (
    <div className="space-y-4">
      {/* Header + refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Potrošnja resursa</h2>
          <p className="text-slate-400 text-sm">
            Prostor za podatke (MongoDB) i medije (Cloudinary).
          </p>
        </div>
        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className={btnPrimary}
        >
          {refresh.isPending ? "Osvežavanje..." : "Osveži potrošnju"}
        </button>
      </div>

      {(isError || refresh.isError) && (
        <div className={`${card} text-red-400 text-sm`}>
          {refresh.isError
            ? "Greška pri osvežavanju potrošnje. Pokušaj ponovo."
            : "Greška pri učitavanju potrošnje."}
        </div>
      )}

      {/* Uvek prikaži obe kartice (sa 0.0 MB dok nema snapshot-a) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Prostor za podatke — MongoDB */}
        <div className={`${card} space-y-3`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-violet-400">
                Prostor za podatke
              </p>
              <h3 className="font-bold text-white mt-0.5">MongoDB Atlas</h3>
              <p className="text-xs text-slate-500">baza podataka</p>
            </div>
            <span className="text-2xl">🍃</span>
          </div>

          <div className="space-y-1.5">
            <p className="text-3xl font-black text-white">
              {fmtMb(m?.storageUsedMb ?? 0)}
            </p>
            <UsageBar used={m?.storageUsedMb ?? 0} limit={mongoLimitMb} />
            <p className="text-xs text-slate-500">
              Limit plana: {fmtLimitMb(mongoLimitMb)}
            </p>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-700">
            <MetricRow label="Connections" value={m?.connections ?? "—"} />
            <MetricRow
              label="CPU avg"
              value={m?.cpuAvgPercent == null ? "—" : `${m.cpuAvgPercent}%`}
            />
            <MetricRow label="Collections" value={m?.collections ?? "—"} />
          </div>

          <p className="text-xs text-slate-500 pt-1">
            Poslednje ažurirano: {fmtDate(mongo?.syncedAt)}
          </p>
        </div>

        {/* Prostor za medije — Cloudinary */}
        <div className={`${card} space-y-3`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-violet-400">
                Prostor za medije
              </p>
              <h3 className="font-bold text-white mt-0.5">Cloudinary</h3>
              <p className="text-xs text-slate-500">slike i fajlovi</p>
            </div>
            <span className="text-2xl">🖼️</span>
          </div>

          <div className="space-y-1.5">
            <p className="text-3xl font-black text-white">
              {fmtMb(c?.storageUsedMb ?? 0)}
            </p>
            <UsageBar
              used={c?.storageUsedMb ?? 0}
              limit={cloudLimitGb * 1024}
            />
            <p className="text-xs text-slate-500">
              Limit plana: {cloudLimitGb} GB
            </p>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-700">
            <MetricRow label="Assets" value={c?.assets ?? "—"} />
            <MetricRow
              label="Bandwidth"
              value={c ? `${c.bandwidthGb} GB` : "—"}
            />
            <MetricRow label="Transformations" value={c?.transformations ?? "—"} />
          </div>

          <p className="text-xs text-slate-500 pt-1">
            Poslednje ažurirano: {fmtDate(cloud?.syncedAt)}
          </p>
        </div>
      </div>

      {/* Top tenant usage */}
      <div className={card}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Top tenant usage</h3>
          {tenantUsage && (
            <span className="text-xs text-slate-500">
              Ukupno DB ~{fmtMb(tenantUsage.data.totalDbEstimateMb)} · Media{" "}
              {fmtMb(tenantUsage.data.totalMediaMb)}
            </span>
          )}
        </div>
        {tenantRows.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">
            Nema podataka. Klikni „Osveži potrošnju“ da prikupiš prvu
            sinhronizaciju.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700">
                  <th className="pb-2 text-left font-semibold">Salon</th>
                  <th className="pb-2 text-right font-semibold">DB estimate</th>
                  <th className="pb-2 text-right font-semibold">Media</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tenantRows.slice(0, 10).map((t) => (
                  <tr key={t.tenantId} className="text-slate-300">
                    <td className="py-2 font-medium">
                      {t.name}
                      <span className="text-slate-500 ml-1">({t.slug})</span>
                    </td>
                    <td className="py-2 text-right">{fmtMb(t.dbEstimateMb)}</td>
                    <td className="py-2 text-right">{fmtMb(t.mediaMb)}</td>
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
