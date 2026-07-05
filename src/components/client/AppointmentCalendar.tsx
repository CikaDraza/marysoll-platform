/**
 * AppointmentCalendar — Client panel calendar.
 *
 * Three view modes: week | day | fullcalendar.
 * Client can create, edit, delete, reschedule own appointments within 1 hour of scheduling.
 * Others' appointments shown as gray "Zauzeto" (non-clickable).
 * Full dark/light mode support.
 */
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  getDay,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
} from "date-fns";
import { sr } from "date-fns/locale";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { DateSelectArg, EventClickArg } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import srLocale from "@fullcalendar/core/locales/sr";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import { useAppointments } from "@/hooks/useAppointments";
import { useAuth } from "@/hooks/useAuth";
import ClientCreateModal from "./ClientCreateModal";
import ClientEditModal from "./ClientEditModal";
import type {
  IAppointment,
  SalonProfileData,
  WorkingHoursMap,
  DayOfWeek,
  ITimeSlot,
  ManualSlotsMap,
} from "@/types";
import { usePublicSalonProfile } from "@/hooks/useSalonProfile";
import { useTenant } from "@/contexts/TenantContext";
import { toFullCalendarBusinessHours } from "@/helpers/parseWorkingHours";
import { WorkingHoursWidget } from "../widgets/WorkingHoursWidget";
import { statusMeta, SLOT_STATE } from "@/lib/appointmentColors";
import { AppointmentLegend } from "@/components/shared/AppointmentLegend";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES_SR: DayOfWeek[] = [
  "Nedelja",
  "Ponedeljak",
  "Utorak",
  "Sreda",
  "Četvrtak",
  "Petak",
  "Subota",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getWorkingRange(
  workingHours: WorkingHoursMap | undefined,
  date: Date,
): { isWorking: boolean; start: string; end: string } {
  if (!workingHours) return { isWorking: false, start: "", end: "" };
  const dayName = DAY_NAMES_SR[getDay(date)] as DayOfWeek;
  const slots = (workingHours[dayName] ?? []) as ITimeSlot[];
  if (!slots.length) return { isWorking: false, start: "", end: "" };
  const starts = slots.map((s) => s.from).sort();
  const ends = slots.map((s) => s.to).sort();
  return { isWorking: true, start: starts[0], end: ends[ends.length - 1] };
}

function generateSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  let cur = toMins(start);
  const endM = toMins(end);
  while (cur < endM) {
    const h = Math.floor(cur / 60)
      .toString()
      .padStart(2, "0");
    const m = (cur % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    cur += 30;
  }
  return slots;
}

// availabilityMode === "manualSlots": eksplicitni termini za jedan datum, sortirani.
function getManualTimesForDate(
  manualSlots: ManualSlotsMap | undefined,
  date: Date,
): { time: string; duration: number }[] {
  if (!manualSlots) return [];
  const dateStr = format(date, "yyyy-MM-dd");
  const list = manualSlots[dateStr];
  if (!Array.isArray(list)) return [];
  return [...list]
    .filter((s) => s && typeof s.time === "string")
    .sort((a, b) => toMins(a.time) - toMins(b.time));
}

// Returns the appointment that covers this slot (start or continuation)
function getSlotAppointment(
  appointments: IAppointment[],
  dateStr: string,
  slot: string,
): IAppointment | null {
  const slotMin = toMins(slot);
  return (
    appointments.find((a) => {
      if (a.date !== dateStr) return false;
      const startMin = toMins(a.time);
      const endMin = startMin + (a.duration || 60);
      return slotMin >= startMin && slotMin < endMin;
    }) ?? null
  );
}

// ─── DayView ──────────────────────────────────────────────────────────────────

function DayView({
  selectedDate,
  appointments,
  workingHours,
  isManual,
  manualSlots,
  userEmail,
  onSlotClick,
  onAppointmentClick,
}: {
  selectedDate: Date;
  appointments: IAppointment[];
  workingHours: WorkingHoursMap | undefined;
  isManual: boolean;
  manualSlots?: ManualSlotsMap;
  userEmail?: string;
  onSlotClick: (date: string, time: string) => void;
  onAppointmentClick: (appt: IAppointment) => void;
}) {
  const range = getWorkingRange(workingHours, selectedDate);
  const manualForDay = isManual
    ? getManualTimesForDate(manualSlots, selectedDate)
    : [];
  const isWorking = isManual ? manualForDay.length > 0 : range.isWorking;
  const slots = isManual
    ? manualForDay.map((s) => s.time)
    : range.isWorking
      ? generateSlots(range.start, range.end)
      : [];
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const dayAppts = appointments.filter((a) => a.date === dateStr);
  const now = new Date();

  if (!isWorking) {
    // Radnim danima bez termina piše "popunjeno" — "ne radi" zbunjuje klijente
    // kad salon inače radi tim danom; vikendom ostaje "ne radi" (kao theme-8).
    const isWeekend = getDay(selectedDate) === 0 || getDay(selectedDate) === 6;
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-sm text-zinc-500 dark:text-zinc-400 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
        <span className="text-2xl">🔒</span>
        <span className="font-semibold">
          {isWeekend
            ? "Salon ne radi ovim danom"
            : "Termini za ovaj dan su popunjeni"}
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {slots.map((slot) => {
        const appt = getSlotAppointment(dayAppts, dateStr, slot);
        const isOwn = appt?.clientEmail === userEmail;
        const isStart = appt?.time === slot;
        const isPast = new Date(`${dateStr}T${slot}`) < now;

        if (appt && isStart && isOwn) {
          // Own appointment start — clickable
          const meta = statusMeta(appt.status);
          return (
            <button
              key={slot}
              onClick={() => onAppointmentClick(appt)}
              className={`flex flex-col items-start gap-0.5 px-3 py-3 rounded-xl border-2 text-left transition hover:opacity-80 cursor-pointer ${meta.chip}`}
            >
              <span className="text-xs font-bold">{slot}</span>
              <span className="text-xs font-semibold leading-tight line-clamp-1">
                {appt.serviceName}
              </span>
              <span className="text-[9px] uppercase tracking-wide font-bold opacity-70 mt-0.5">
                {meta.label}
              </span>
            </button>
          );
        }

        if (appt) {
          // Others' appointment or continuation — non-clickable (Zauzeto, tamno)
          return (
            <div
              key={slot}
              className={`flex flex-col items-start gap-0.5 px-3 py-3 rounded-xl border ${SLOT_STATE.busy.fill} ${!isStart ? "opacity-30" : ""}`}
            >
              <span className="text-xs font-bold text-white/70">{slot}</span>
              {isStart && (
                <span className="text-xs text-white font-semibold">
                  Zauzeto
                </span>
              )}
            </div>
          );
        }

        // Past free slot
        if (isPast) {
          return (
            <div
              key={slot}
              className={`flex flex-col items-start px-3 py-3 rounded-xl ${SLOT_STATE.past.fill}`}
            >
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                {slot}
              </span>
            </div>
          );
        }

        // Free future slot — clickable
        return (
          <button
            key={slot}
            onClick={() => onSlotClick(dateStr, slot)}
            className="flex flex-col items-start gap-0.5 px-3 py-3 rounded-xl border-2 border-violet-300 dark:border-violet-700 bg-white dark:bg-gray-900 text-left hover:border-violet-500 dark:hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition group cursor-pointer"
          >
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-violet-600 dark:group-hover:text-violet-400">
              {slot}
            </span>
            <span className="text-[10px] text-violet-400 dark:text-violet-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 font-semibold">
              + Zakaži
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── WeekView ─────────────────────────────────────────────────────────────────

function WeekView({
  weekStart,
  appointments,
  workingHours,
  isManual,
  manualSlots,
  selectedDate,
  userEmail,
  onDayClick,
  onAppointmentClick,
}: {
  weekStart: Date;
  appointments: IAppointment[];
  workingHours: WorkingHoursMap | undefined;
  isManual: boolean;
  manualSlots?: ManualSlotsMap;
  selectedDate: Date;
  userEmail?: string;
  onDayClick: (day: Date) => void;
  onAppointmentClick: (appt: IAppointment) => void;
}) {
  const days = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
  });

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayAppts = appointments.filter((a) => a.date === dateStr);
        const isWorking = isManual
          ? getManualTimesForDate(manualSlots, day).length > 0
          : getWorkingRange(workingHours, day).isWorking;
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());

        return (
          <button
            key={dateStr}
            onClick={() => onDayClick(day)}
            className={`flex flex-col items-stretch gap-1 p-1 sm:p-2 rounded-xl border transition min-h-[84px] sm:min-h-[100px] text-left cursor-pointer ${
              isSelected
                ? "border-violet-400 bg-violet-900 dark:bg-violet-950"
                : isToday
                  ? `border-zinc-100 dark:border-zinc-700 bg-white dark:bg-gray-900/50 ${SLOT_STATE.today.fill}`
                  : !isWorking
                    ? SLOT_STATE.nonWorking.fill
                    : "border-zinc-100 dark:border-zinc-700 bg-white dark:bg-gray-900/50 shadow hover:border-violet-200 dark:hover:border-violet-700"
            }`}
          >
            <div className="text-center mb-1">
              <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">
                {format(day, "EEE", { locale: sr })}
              </span>
              <p
                className={`text-sm font-bold ${
                  isToday
                    ? "text-amber-600"
                    : isSelected
                      ? "text-violet-400"
                      : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {format(day, "d")}
              </p>
            </div>

            {/* Mobilni: okrugli indikator (zeleno = ima termina, tamno sivo = nema);
                desktop zadržava "Neradan" tekst */}
            <span
              className={`sm:hidden mx-auto w-2 h-2 rounded-full ${
                isWorking ? "bg-green-500" : "bg-gray-500 dark:bg-gray-600"
              }`}
            />
            {!isWorking && (
              <span className="hidden sm:block text-[9px] text-gray-400 text-center">
                Neradan
              </span>
            )}

            {dayAppts.slice(0, 3).map((a) => {
              const isOwn = a.clientEmail === userEmail;
              return (
                <div
                  key={a._id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isOwn) onAppointmentClick(a);
                  }}
                  className={`px-1.5 py-1 rounded-lg text-[9px] font-semibold border leading-tight truncate ${
                    isOwn
                      ? statusMeta(a.status).chip +
                        " cursor-pointer hover:opacity-80"
                      : SLOT_STATE.busy.fill + " cursor-default"
                  }`}
                >
                  <span className="font-bold">{a.time}</span>{" "}
                  {isOwn ? a.serviceName : "Zauzeto"}
                </div>
              );
            })}

            {dayAppts.length > 3 && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center">
                +{dayAppts.length - 3} još
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type ViewMode = "day" | "week" | "fullcalendar";

export default function AppointmentCalendar() {
  const { user } = useAuth();
  const { tenantSlug, base } = useTenant();

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<IAppointment | null>(null);
  const [createDefaults, setCreateDefaults] = useState({ date: "", time: "" });

  // Touch tracking for FullCalendar swipe detection
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const touchMoveRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current.x) return;
    touchMoveRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    const dx = Math.abs(touchMoveRef.current.x - touchStartRef.current.x);
    const dy = Math.abs(touchMoveRef.current.y - touchStartRef.current.y);
    if (dx > 5 || dy > 5) setIsSwiping(true);
  };

  const handleTouchEnd = () => setTimeout(() => setIsSwiping(false), 300);

  // Dan-strip: skroluj strip do izabranog dana — klik na "Danas" (ili bilo koji
  // izbor datuma) centrira odgovarajuće dugme, isti šablon kao Y2K widget.
  const dayStripRef = useRef<HTMLDivElement>(null);
  const activeDayRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (viewMode !== "day") return;
    const container = dayStripRef.current;
    const btn = activeDayRef.current;
    if (!container || !btn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    const delta =
      bRect.left - cRect.left - container.clientWidth / 2 + bRect.width / 2;
    container.scrollTo({
      left: container.scrollLeft + delta,
      behavior: "smooth",
    });
  }, [viewMode, selectedDate]);

  const {
    data: response,
    isLoading,
    isError,
  } = useAppointments({ page: 1, limit: 100 });
  const { data: salonProfile } = usePublicSalonProfile(tenantSlug);

  const safeProfile: SalonProfileData = salonProfile ?? {
    _id: "",
    name: "",
    email: "",
    description: "",
    phone: "",
    street: "",
    city: "",
    social: {},
    newsletterEmail: "",
  };

  const workingHours = salonProfile?.workingHours as
    | WorkingHoursMap
    | undefined;
  const businessHours = toFullCalendarBusinessHours(
    (workingHours ?? {}) as Record<string, unknown>,
  );

  const isManual = salonProfile?.availabilityMode === "manualSlots";
  const manualSlots = salonProfile?.manualSlots as ManualSlotsMap | undefined;

  const appointments = useMemo(
    () => response?.appointments || [],
    [response?.appointments],
  );

  // ── Event handlers ────────────────────────────────────────────────────────

  function handleSlotClick(date: string, time: string) {
    if (!user) return toast.error("Morate biti prijavljeni.");
    const slotDate = new Date(`${date}T${time}`);
    if (slotDate < new Date())
      return toast.error("Ne možete zakazati za prošli termin.");
    setCreateDefaults({ date, time });
    setCreateOpen(true);
  }

  function handleAppointmentClick(appt: IAppointment) {
    setSelectedAppt(appt);
    setEditOpen(true);
  }

  function handleDayClick(day: Date) {
    setSelectedDate(day);
    setViewMode("day");
  }

  // FullCalendar: click on own event → edit modal
  function handleEventClick(info: EventClickArg) {
    const appt = appointments.find((a) => a._id === info.event.id);
    if (!appt || appt.clientEmail !== user?.email) return;
    handleAppointmentClick(appt);
  }

  // FullCalendar: select / date click → create modal
  const handleDateSelect = (info: DateSelectArg) => {
    if (!user) return toast.error("Morate biti prijavljeni.");
    if (isSwiping) return;
    if (info.start < new Date())
      return toast.error("Ne možete zakazati za ovaj termin.");

    if (isManual) {
      const time = info.start.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const times = getManualTimesForDate(manualSlots, info.start).map(
        (s) => s.time,
      );
      if (!times.includes(time)) return toast.error("Termin nije dostupan.");
      setCreateDefaults({ date: info.start.toLocaleDateString("en-CA"), time });
      setCreateOpen(true);
      return;
    }

    const dayNumber = info.start.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const timeValue = info.start.getHours() * 60 + info.start.getMinutes();
    const workingEntry = businessHours.find((b) =>
      b?.daysOfWeek.includes(dayNumber),
    );
    if (!workingEntry) return toast.error("Salon ne radi ovaj dan.");
    const [sH, sM] = workingEntry.startTime.split(":").map(Number);
    const [eH, eM] = workingEntry.endTime.split(":").map(Number);
    if (timeValue < sH * 60 + sM || timeValue >= eH * 60 + eM)
      return toast.error("Ne možete zakazati za ovaj termin.");

    const date = info.start.toLocaleDateString("en-CA");
    const time = info.start.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setCreateDefaults({ date, time });
    setCreateOpen(true);
  };

  const handleDateClick = (info: DateClickArg) => {
    if (!user) return toast.error("Morate biti prijavljeni.");
    if (info.date < new Date())
      return toast.error("Ne možete zakazati za ovaj termin.");

    if (isManual) {
      const time = info.date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const times = getManualTimesForDate(manualSlots, info.date).map(
        (s) => s.time,
      );
      if (!times.includes(time)) return toast.error("Termin nije dostupan.");
      setCreateDefaults({ date: info.date.toLocaleDateString("en-CA"), time });
      setCreateOpen(true);
      return;
    }

    const dayNumber = info.date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const timeValue = info.date.getHours() * 60 + info.date.getMinutes();
    const workingEntry = businessHours.find((b) =>
      b?.daysOfWeek.includes(dayNumber),
    );
    if (!workingEntry) return toast.error("Salon ne radi ovaj dan.");
    const [sH, sM] = workingEntry.startTime.split(":").map(Number);
    const [eH, eM] = workingEntry.endTime.split(":").map(Number);
    if (timeValue < sH * 60 + sM || timeValue >= eH * 60 + eM)
      return toast.error("Ne možete zakazati za ovaj termin.");

    const date = info.date.toLocaleDateString("en-CA");
    const time = info.date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setCreateDefaults({ date, time });
    setCreateOpen(true);
  };

  // FullCalendar events — own colored, others gray
  const fcEvents = useMemo(
    () =>
      appointments.map((a: IAppointment) => {
        const duration = a.duration || 60;
        const start = new Date(`${a.date}T${a.time}`);
        const end = new Date(start.getTime() + duration * 60000);
        const isOwn = a.clientEmail === user?.email;
        const color = isOwn ? statusMeta(a.status).hex : SLOT_STATE.busy.hex;
        return {
          id: a._id,
          title: isOwn
            ? `${a.serviceName} (${statusMeta(a.status).label})`
            : "Zauzeto",
          start,
          end,
          backgroundColor: color,
          borderColor: color,
          textColor: "#ffffff",
        };
      }),
    [appointments, user?.email],
  );

  // Manual mode: render explicit slots as available background events
  const manualEvents = useMemo(() => {
    if (!isManual || !manualSlots) return [];
    const evts: {
      start: Date;
      end: Date;
      display: "background";
      backgroundColor: string;
      classNames: string[];
    }[] = [];
    for (const [dateStr, list] of Object.entries(manualSlots)) {
      if (!Array.isArray(list)) continue;
      for (const s of list) {
        const start = new Date(`${dateStr}T${s.time}`);
        const end = new Date(start.getTime() + (s.duration || 60) * 60000);
        evts.push({
          start,
          end,
          display: "background",
          backgroundColor: "rgba(124, 58, 237, 0.07)",
          classNames: ["fc-free-slot"],
        });
      }
    }
    return evts;
  }, [isManual, manualSlots]);

  // ── Navigation label ──────────────────────────────────────────────────────

  const navLabel =
    viewMode === "week"
      ? `${format(weekStart, "d. MMM", { locale: sr })} – ${format(endOfWeek(weekStart, { weekStartsOn: 1 }), "d. MMM yyyy.", { locale: sr })}`
      : viewMode === "day"
        ? format(selectedDate, "EEEE, d. MMMM yyyy.", { locale: sr })
        : null;

  const card =
    "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

  return (
    <>
      <div className="space-y-5">
        {/* Info row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <div className="flex">
            <WorkingHoursWidget
              profile={safeProfile}
              rulesHref={`${base}/pravila-zakazivanja`}
              className="flex-1"
            />
          </div>

          {/* Legend */}
          <AppointmentLegend className={`${card} h-full`} />
        </div>

        {/* Calendar */}
        <div className={card + " !p-0 overflow-hidden"}>
          {/* Toolbar — isti responsive raspored kao AppointmentAdminCalendar:
              view toggle preko cele širine na mobilnom, navigacija ispod,
              "Danas" u svom redu levo. Bez "+ Zakaži termin" — klijent bira
              termin klikom na slobodan slot. */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 px-5 py-3 max-sm:px-3 max-sm:py-2.5 border-b border-zinc-100 dark:border-zinc-700">
            {/* View toggle — full width na mobilnom */}
            <div className="w-full sm:w-auto sm:flex-1 flex items-center gap-1 bg-zinc-100 dark:bg-gray-800 rounded-xl p-1">
              {(
                [
                  ["week", "Sedmica"],
                  ["day", "Dan"],
                  ["fullcalendar", "Kalendar"],
                ] as [ViewMode, string][]
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                    viewMode === v
                      ? "bg-white dark:bg-gray-700 text-violet-700 dark:text-violet-400 shadow-sm"
                      : "text-zinc-400 dark:text-gray-400 hover:text-zinc-700 dark:hover:text-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Navigation — hidden in fullcalendar mode */}
            {viewMode !== "fullcalendar" && (
              <div className="w-full sm:w-auto sm:flex-none flex items-center justify-center gap-2">
                <button
                  onClick={() =>
                    viewMode === "week"
                      ? setWeekStart((w) => subWeeks(w, 1))
                      : setSelectedDate((d) => subDays(d, 1))
                  }
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-gray-800 transition text-zinc-400 dark:text-gray-400 hover:text-zinc-700 dark:hover:text-gray-200 cursor-pointer"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold text-zinc-800 dark:text-gray-300 min-w-[160px] sm:min-w-[180px] text-center capitalize">
                  {navLabel}
                </span>
                <button
                  onClick={() =>
                    viewMode === "week"
                      ? setWeekStart((w) => addWeeks(w, 1))
                      : setSelectedDate((d) => addDays(d, 1))
                  }
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-gray-800 transition text-zinc-400 dark:text-gray-400 hover:text-zinc-700 dark:hover:text-gray-200 cursor-pointer"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
                {/* Danas — desktop, pored strelica */}
                <button
                  onClick={() => {
                    const today = new Date();
                    setSelectedDate(today);
                    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
                  }}
                  className="hidden sm:inline-flex ml-1 px-3 py-1.5 text-xs font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-800/30 transition cursor-pointer"
                >
                  Danas
                </button>
              </div>
            )}

            {/* Danas — mobilni: svoj red ispod izbora datuma, levo */}
            {viewMode !== "fullcalendar" && (
              <div className="w-full sm:hidden flex items-center justify-start">
                <button
                  onClick={() => {
                    const today = new Date();
                    setSelectedDate(today);
                    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-800/30 transition cursor-pointer"
                >
                  Danas
                </button>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-48 text-zinc-400 dark:text-gray-300 text-sm gap-2">
                <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                Učitavanje termina...
              </div>
            ) : isError ? (
              <p className="text-center text-red-500 py-10">
                Greška pri učitavanju.
              </p>
            ) : viewMode === "week" ? (
              <WeekView
                weekStart={weekStart}
                appointments={appointments}
                workingHours={workingHours}
                isManual={isManual}
                manualSlots={manualSlots}
                selectedDate={selectedDate}
                userEmail={user?.email}
                onDayClick={handleDayClick}
                onAppointmentClick={handleAppointmentClick}
              />
            ) : viewMode === "day" ? (
              <>
                {/* Day strip */}
                <div
                  ref={dayStripRef}
                  className="flex gap-1.5 overflow-x-auto px-0.5 pt-1.5 pb-3 mb-4 scrollbar-none"
                >
                  {Array.from({ length: 14 }).map((_, i) => {
                    const day = addDays(new Date(), i - 3);
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const isWorking = isManual
                      ? getManualTimesForDate(manualSlots, day).length > 0
                      : getWorkingRange(workingHours, day).isWorking;
                    return (
                      <button
                        key={i}
                        ref={isSelected ? activeDayRef : null}
                        onClick={() => setSelectedDate(day)}
                        className={`flex flex-col items-center flex-shrink-0 w-12 h-14 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? "bg-violet-600 border-violet-600 text-white"
                            : isToday
                              ? `border-zinc-100 dark:border-gray-700 bg-white dark:bg-gray-900 text-zinc-600 dark:text-gray-400 ${SLOT_STATE.today.fill}`
                              : !isWorking
                                ? SLOT_STATE.nonWorking.fill
                                : "border-zinc-100 dark:border-gray-700 bg-white dark:bg-gray-900 text-zinc-600 dark:text-gray-400 hover:border-violet-200 dark:hover:border-violet-700"
                        }`}
                      >
                        <span className="text-[9px] uppercase font-bold mt-2">
                          {format(day, "EEE", { locale: sr })}
                        </span>
                        <span className="text-sm font-bold">
                          {format(day, "d")}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <DayView
                  selectedDate={selectedDate}
                  appointments={appointments}
                  workingHours={workingHours}
                  isManual={isManual}
                  manualSlots={manualSlots}
                  userEmail={user?.email}
                  onSlotClick={handleSlotClick}
                  onAppointmentClick={handleAppointmentClick}
                />
              </>
            ) : (
              /* FullCalendar view */
              <div
                className="admin-fc"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="timeGridWeek"
                  selectable
                  select={handleDateSelect}
                  dateClick={handleDateClick}
                  eventClick={handleEventClick}
                  editable={false}
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                  }}
                  height="auto"
                  slotDuration="00:30:00"
                  slotLabelInterval="01:00:00"
                  slotLabelFormat={{
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  }}
                  allDaySlot={false}
                  slotMinTime="06:00:00"
                  slotMaxTime="23:00:00"
                  events={isManual ? [...fcEvents, ...manualEvents] : fcEvents}
                  businessHours={isManual ? undefined : businessHours}
                  locale={srLocale}
                  firstDay={1}
                  dayHeaderContent={(args) => {
                    const names = [
                      "Ned",
                      "Pon",
                      "Uto",
                      "Sre",
                      "Čet",
                      "Pet",
                      "Sub",
                    ];
                    const d = new Date(args.date);
                    return {
                      html: `<div class="text-center"><span class="text-xs text-gray-400 dark:text-gray-500 uppercase">${names[d.getDay()]}</span><br/><span class="font-bold text-gray-800 dark:text-gray-200">${d.getDate()}.${d.getMonth() + 1}.</span></div>`,
                    };
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ClientCreateModal
        key={`create-${createDefaults.date}-${createDefaults.time}`}
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultDate={createDefaults.date}
        defaultTime={createDefaults.time}
        token={user?.token}
        availabilityMode={salonProfile?.availabilityMode}
        manualSlots={manualSlots}
        bookedAppointments={appointments}
      />

      <ClientEditModal
        key={selectedAppt?._id ?? "edit"}
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedAppt(null);
        }}
        appointment={selectedAppt}
        token={user?.token}
        availabilityMode={salonProfile?.availabilityMode}
        manualSlots={manualSlots}
        bookedAppointments={appointments}
      />
    </>
  );
}
