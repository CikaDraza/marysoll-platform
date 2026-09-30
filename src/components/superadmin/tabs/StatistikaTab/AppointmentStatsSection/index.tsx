"use client";

import { useState } from "react";
import { superAdminCardClass as card } from "@/components/superadmin/shared";
import { useSuperAdminAppointmentStats } from "@/hooks/useSuperAdminAppointmentStats";
import { StatCell } from "@/components/superadmin/tabs/StatistikaTab/StatCell";
import type { SalonUsageGrowth } from "@/types/superadmin-statistics";

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Jun",
  "Jul",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

function fmtDeltaMb(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(3)} MB`;
}

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString("sr-Latn-RS", {
    day: "numeric",
    month: "numeric",
    timeZone: "Europe/Belgrade",
  });
}

function UsageGrowthRow({ growth }: { growth: SalonUsageGrowth | null }) {
  if (!growth) {
    return (
      <p className="pt-3 border-t border-slate-700 text-xs text-slate-500">
        Rast potrošnje: nema snimaka potrošnje za ovaj mesec.
      </p>
    );
  }
  return (
    <div className="pt-3 border-t border-slate-700 space-y-2">
      <div className="grid grid-cols-2 gap-4">
        <StatCell
          label="Δ Mongo procena"
          value={fmtDeltaMb(growth.mongoDeltaMb)}
          color="text-teal-400"
        />
        <StatCell
          label="Δ Cloudinary"
          value={fmtDeltaMb(growth.cloudinaryDeltaMb)}
          color="text-sky-400"
        />
      </div>
      <p className="text-xs text-slate-500 text-center">
        Snimci {fmtDay(growth.openingAt)}
        {growth.openingFromPreviousMonth
          ? " (kraj prethodnog meseca)"
          : ""} → {fmtDay(growth.closingAt)}
        {" · "}na kraju: {growth.closingMongoMb.toFixed(3)} MB Mongo ·{" "}
        {growth.closingCloudinaryMb.toFixed(3)} MB Cloudinary
        {growth.mongoDeltaMb == null
          ? " · potreban je još jedan snimak za rast"
          : ""}
      </p>
    </div>
  );
}

export function AppointmentStatsSection() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, isError } = useSuperAdminAppointmentStats(
    month,
    year,
  );

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-4">
      {/* Header + month/year picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">
            Pregled performansi salona po mesecima
          </h2>
          <p className="text-slate-400 text-sm">
            {MONTH_NAMES[month - 1]} {year}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Zakazano za mesec je po datumu održavanja, kreirano po datumu upisa,
            obavljeno po datumu završetka. Klijenti i statusi su po datumu
            održavanja; klijenti se broje jednom po profilu.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Salon rows */}
      {isLoading && (
        <div className={`${card} text-center py-8 text-slate-400 text-sm`}>
          Učitavanje...
        </div>
      )}
      {isError && (
        <div className={`${card} text-center py-8 text-red-400 text-sm`}>
          Greška pri učitavanju
        </div>
      )}
      {data?.stats.length === 0 && (
        <div className={`${card} text-center py-8 text-slate-400 text-sm`}>
          Nema termina ni snimaka potrošnje za {MONTH_NAMES[month - 1]} {year}.
        </div>
      )}
      {data?.stats.map((salon) => (
        <div key={salon.tenantId} className={`${card} space-y-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">{salon.salonName}</p>
              <p className="text-xs text-slate-500">{salon.slug}</p>
              <p className="text-xs text-slate-400 mt-1">
                Aktivno osoblje (sada):{" "}
                <span className="font-semibold text-white">
                  {salon.activeStaffCount}
                </span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-white">
                {salon.appointmentsScheduled}
              </span>
              <p className="text-xs text-slate-400">
                Termina zakazano za mesec
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-700">
            <StatCell
              label="Kreirano u mesecu"
              value={salon.appointmentsCreated}
              color="text-fuchsia-400"
            />
            <StatCell
              label="Obavljeno u mesecu"
              value={salon.appointmentsCompleted}
              color="text-blue-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-700">
            <StatCell
              label="Klijenata zakazalo"
              value={salon.clientsBooked}
              color="text-cyan-400"
            />
            <StatCell
              label="Klijenata sa potvrđenim terminom"
              value={salon.clientsApproved}
              color="text-violet-400"
            />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 pt-3 border-t border-slate-700">
            <StatCell
              label="Potvrđena"
              value={salon.nova}
              color="text-emerald-400"
            />
            <StatCell
              label="Čeka"
              value={salon.cekaNaOdobrenje}
              color="text-amber-400"
            />
            <StatCell
              label="Završena"
              value={salon.zavrsena}
              color="text-blue-400"
            />
            <StatCell
              label="Otkazana"
              value={salon.otkazana}
              color="text-red-400"
            />
            <StatCell
              label="Nije došlo"
              value={salon.nijeSePojavilo}
              color="text-slate-400"
            />
          </div>
          <UsageGrowthRow growth={salon.usageGrowth} />
        </div>
      ))}
    </div>
  );
}
