"use client";

import { useState } from "react";
import { superAdminCardClass as card } from "@/components/superadmin/shared";
import { useSuperAdminAppointmentStats } from "@/hooks/useSuperAdminAppointmentStats";
import { StatCell } from "@/components/superadmin/tabs/StatistikaTab/StatCell";

const MONTH_NAMES = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
];

export function AppointmentStatsSection() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, isError } = useSuperAdminAppointmentStats(month, year);

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-4">
      {/* Header + month/year picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Pregled performansi salona po mesecima</h2>
          <p className="text-slate-400 text-sm">
            {MONTH_NAMES[month - 1]} {year}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Termini su po datumu održavanja; klijenti se broje jednom po profilu. Potvrđeni su trenutno odobreni termini, završeni su prikazani odvojeno.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Salon rows */}
      {isLoading && (
        <div className={`${card} text-center py-8 text-slate-400 text-sm`}>Učitavanje...</div>
      )}
      {isError && (
        <div className={`${card} text-center py-8 text-red-400 text-sm`}>Greška pri učitavanju</div>
      )}
      {data?.stats.length === 0 && (
        <div className={`${card} text-center py-8 text-slate-400 text-sm`}>
          Nema termina za {MONTH_NAMES[month - 1]} {year}.
        </div>
      )}
      {data?.stats.map((salon) => (
        <div key={salon.tenantId} className={`${card} space-y-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">{salon.salonName}</p>
              <p className="text-xs text-slate-500">{salon.slug}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-white">{salon.total}</span>
              <p className="text-xs text-slate-400">Ukupno termina</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-700">
            <StatCell label="Klijenata zakazalo" value={salon.clientsBooked} color="text-cyan-400" />
            <StatCell label="Klijenata sa potvrđenim terminom" value={salon.clientsApproved} color="text-violet-400" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 pt-3 border-t border-slate-700">
            <StatCell label="Potvrđena" value={salon.nova} color="text-emerald-400" />
            <StatCell label="Čeka" value={salon.cekaNaOdobrenje} color="text-amber-400" />
            <StatCell label="Završena" value={salon.zavrsena} color="text-blue-400" />
            <StatCell label="Otkazana" value={salon.otkazana} color="text-red-400" />
            <StatCell label="Nije došlo" value={salon.nijeSePojavilo} color="text-slate-400" />
          </div>
        </div>
      ))}
    </div>
  );
}
