/**
 * lib/appointmentColors.ts
 *
 * JEDINI IZVOR ISTINE za boje termina i stanja slotova.
 * Koristi se svuda gde se prikazuju termini/slotovi: dashboard kalendar,
 * panel kalendar, javni kalendar (termini), booking widget, liste i edit modal.
 *
 * - APPOINTMENT_STATUS_META — boja + labela po statusu (čip/badge/FullCalendar)
 * - SLOT_STATE — boje za stanja slota (slobodan/zauzet/prošlo/neradan/danas)
 * - APPOINTMENT_LEGEND / SLOT_LEGEND — tipizirane liste za prikaz legende
 *
 * Pravila šeme (jasno razlikovanje svih pojmova):
 *   Statusi su 7 različitih boja; "Zauzeto" je puna tamna; "Neradan" je svetlo sivo;
 *   "Današnji dan" je samo ring (bez fila, da se ne sudara sa statusima).
 */
import {
  APPOINTMENT_STATUSES,
  type AppointmentStatusValue,
} from "@/types/constants";

export interface StatusMeta {
  /** Srpska labela za legendu/badge. */
  label: string;
  /** Tailwind klase za čip/badge (bg + border + text, sa dark varijantama). */
  chip: string;
  /** Hex boja za FullCalendar evente (Tailwind klase ne rade u FC). */
  hex: string;
}

const APPOINTMENT_STATUS_META: Record<AppointmentStatusValue, StatusMeta> =
  {
    pending: {
      label: "Čeka",
      chip: "bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-900/40 dark:border-amber-500 dark:text-amber-200",
      hex: "#f59e0b", // amber-500
    },
    appointment_approved: {
      label: "Odobreno",
      chip: "bg-green-100 border-green-400 text-green-900 dark:bg-green-900/40 dark:border-green-500 dark:text-green-200",
      hex: "#22c55e", // green-500
    },
    completed: {
      label: "Završeno",
      chip: "bg-indigo-100 border-indigo-400 text-indigo-900 dark:bg-indigo-900/40 dark:border-indigo-500 dark:text-indigo-200",
      hex: "#4f46e5", // indigo-600
    },
    appointment_rescheduled: {
      label: "Pomereno",
      chip: "bg-sky-100 border-sky-400 text-sky-900 dark:bg-sky-900/40 dark:border-sky-500 dark:text-sky-200",
      hex: "#0ea5e9", // sky-500
    },
    appointment_rejected: {
      label: "Odbijeno",
      chip: "bg-red-100 border-red-400 text-red-800 dark:bg-red-900/40 dark:border-red-500 dark:text-red-200",
      hex: "#ef4444", // red-500
    },
    appointment_cancelled: {
      label: "Otkazano",
      chip: "bg-slate-200 border-slate-400 text-slate-700 line-through dark:bg-slate-700 dark:border-slate-500 dark:text-slate-200",
      hex: "#64748b", // slate-500
    },
    no_show: {
      label: "Nije došao",
      chip: "bg-fuchsia-100 border-fuchsia-400 text-fuchsia-900 dark:bg-fuchsia-900/40 dark:border-fuchsia-500 dark:text-fuchsia-200",
      hex: "#d946ef", // fuchsia-500
    },
  };

/** Bezbedan pristup metapodacima statusa (fallback na neutralno za nepoznat status). */
export function statusMeta(status: string): StatusMeta {
  return (
    APPOINTMENT_STATUS_META[status as AppointmentStatusValue] ?? {
      label: status,
      chip: "bg-zinc-100 border-zinc-400 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-500 dark:text-zinc-200",
      hex: "#a1a1aa", // zinc-400
    }
  );
}

export interface SlotStateMeta {
  label: string;
  /** Tailwind klase za popunu slota. */
  fill: string;
  /** Klasa za kvadratić u legendi (bez teksta). */
  swatch: string;
  hex?: string;
}

export const SLOT_STATE = {
  free: {
    label: "Slobodan",
    fill: "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700",
    swatch: "bg-white border-gray-400 dark:bg-gray-900 dark:border-gray-500",
  },
  busy: {
    label: "Zauzeto",
    fill: "bg-zinc-800 border-zinc-800 text-white",
    swatch: "bg-zinc-800 border-zinc-800",
    hex: "#27272a", // zinc-800
  },
  past: {
    label: "Prošlo",
    fill: "border border-dashed border-gray-300 text-gray-400 opacity-50 dark:border-gray-700",
    swatch: "border border-dashed border-gray-300 dark:border-gray-600",
  },
  nonWorking: {
    label: "Neradan dan",
    fill: "bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-800 dark:border-gray-600",
    swatch: "bg-gray-200 border-gray-400 dark:bg-gray-700 dark:border-gray-500",
  },
  today: {
    label: "Današnji dan",
    fill: "ring-2 ring-amber-400",
    swatch: "ring-2 ring-amber-400 border-transparent",
  },
} as const satisfies Record<string, SlotStateMeta>;

export interface LegendItem {
  label: string;
  /** Klasa za kvadratić (bg/border/ring). */
  swatch: string;
}

/** Statusi termina, redom — za legendu. */
export const APPOINTMENT_LEGEND: LegendItem[] = APPOINTMENT_STATUSES.map(
  (status) => ({
    label: APPOINTMENT_STATUS_META[status].label,
    swatch: APPOINTMENT_STATUS_META[status].chip,
  }),
);

/** Stanja slota — za legendu. (Današnji dan je samo orijentir, nije u legendi.) */
export const SLOT_LEGEND: LegendItem[] = [
  { label: "Zauzeto", swatch: SLOT_STATE.busy.swatch },
  { label: "Slobodan slot", swatch: SLOT_STATE.free.swatch },
  { label: "Neradan dan", swatch: SLOT_STATE.nonWorking.swatch },
];
