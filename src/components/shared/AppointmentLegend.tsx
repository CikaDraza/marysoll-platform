/**
 * AppointmentLegend — deljena legenda statusa termina + stanja slota.
 * Koriste je dashboard i panel kalendar (ista šema boja iz lib/appointmentColors).
 */
import { APPOINTMENT_LEGEND, SLOT_LEGEND } from "@/lib/appointmentColors";

export function AppointmentLegend({ className = "" }: { className?: string }) {
  const items = [...APPOINTMENT_LEGEND, ...SLOT_LEGEND];
  return (
    <div className={className}>
      <p className="text-[11px] font-bold text-zinc-400 dark:text-gray-300 uppercase tracking-widest mb-3">
        Legenda
      </p>
      <div className="grid grid-cols-2 gap-2">
        {items.map(({ label, swatch }) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded border flex-shrink-0 ${swatch}`}
            />
            <span className="text-xs text-zinc-600 dark:text-gray-300">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
