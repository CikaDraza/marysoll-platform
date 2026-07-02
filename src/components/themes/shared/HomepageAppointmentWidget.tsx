/**
 * HomepageAppointmentWidget — Public-facing appointment calendar for the home page.
 *
 * Week + Day view only (no FullCalendar).
 * Shows working hours widget at top, no legend.
 * Time slot buttons:
 *   - Available  → violet hover, clickable → opens booking modal
 *   - Booked     → black bg, not clickable
 * Non-working days: red border + light-red bg (day button in week view)
 * Day strip has prev/next arrows in addition to scroll.
 *
 * Auth flow:
 *   - Logged-in user  → fills form → "Zakaži termin" → creates appointment via API
 *   - Guest user      → fills form → "Postavi za rezervaciju" → saves to sessionStorage
 *                       → redirects to login/register page
 *   - On mount: if user is logged in AND sessionStorage has pending appointment
 *                       → auto-opens modal with pre-filled data for final confirm
 */
"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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
  differenceInCalendarDays,
} from "date-fns";
import { sr } from "date-fns/locale";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { detectCustomDomain } from "@/hooks/useClientRouting";
import {
  BookingModal,
  PENDING_STORAGE_KEY,
} from "@/components/shared/BookingModal";
import type { PendingAppointment } from "@/components/shared/BookingModal";
import type {
  WorkingHoursMap,
  DayOfWeek,
  ITimeSlot,
  IService,
  SalonProfileData,
  ManualSlotsMap,
} from "@/types";
import { manualTimesForDate, isManualSlotTaken } from "@/helpers/manualSlots";

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

// ─── Types ────────────────────────────────────────────────────────────────────

type PublicAppt = {
  _id: string;
  date: string;
  time: string;
  duration: number;
  serviceName: string;
  status: string;
};

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

function isSlotBooked(
  appointments: PublicAppt[],
  dateStr: string,
  slot: string,
): boolean {
  const slotMin = toMins(slot);
  return appointments.some((a) => {
    if (a.date !== dateStr) return false;
    const startMin = toMins(a.time);
    const endMin = startMin + (a.duration || 60);
    return slotMin >= startMin && slotMin < endMin;
  });
}

function isDayFullyBooked(
  appointments: PublicAppt[],
  slots: string[],
  dateStr: string,
): boolean {
  if (!slots.length) return false;
  return slots.every((slot) => isSlotBooked(appointments, dateStr, slot));
}

// ─── DayView ──────────────────────────────────────────────────────────────────

function DayView({
  selectedDate,
  appointments,
  workingHours,
  isManual,
  manualSlots,
  onSlotClick,
}: {
  selectedDate: Date;
  appointments: PublicAppt[];
  workingHours: WorkingHoursMap | undefined;
  isManual: boolean;
  manualSlots?: ManualSlotsMap;
  onSlotClick: (date: string, time: string) => void;
}) {
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const range = getWorkingRange(workingHours, selectedDate);
  const manualForDay = isManual ? manualTimesForDate(manualSlots, dateStr) : [];
  const isWorking = isManual ? manualForDay.length > 0 : range.isWorking;
  const slots: { time: string; duration?: number }[] = isManual
    ? manualForDay
    : (range.isWorking ? generateSlots(range.start, range.end) : []).map(
        (t) => ({ time: t }),
      );
  const now = new Date();

  if (!isWorking) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 rounded-2xl border-2 border-gray-300 bg-gray-100 text-gray-400">
        <span className="text-2xl">🔒</span>
        <span className="text-sm font-semibold">Salon ne radi ovim danom</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {slots.map((slot) => {
        const booked = isManual
          ? isManualSlotTaken(
              appointments,
              dateStr,
              toMins(slot.time),
              slot.duration ?? 60,
            )
          : isSlotBooked(appointments, dateStr, slot.time);
        const isPast = new Date(`${dateStr}T${slot.time}`) < now;

        if (booked) {
          return (
            <div
              key={slot.time}
              className="flex flex-col items-center justify-center gap-0.5 px-3 py-3 rounded-xl bg-zinc-800 border-2 border-zinc-800 text-white select-none"
              title="Termin zauzet"
            >
              <span className="text-xs font-bold">{slot.time}</span>
              <span className="text-[10px] opacity-60 font-medium">
                Zauzeto
              </span>
            </div>
          );
        }

        if (isPast) {
          return (
            <div
              key={slot.time}
              className="flex flex-col items-center justify-center px-3 py-3 rounded-xl border border-dashed border-gray-300 opacity-50 select-none"
            >
              <span className="text-xs font-bold text-gray-400">
                {slot.time}
              </span>
            </div>
          );
        }

        return (
          <button
            key={slot.time}
            onClick={() => onSlotClick(dateStr, slot.time)}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-3 rounded-xl border-2 border-gray-200 hover:border-(--primary-color)/80 hover:bg-(--primary-color)/10 hover:text-(--primary-color) transition-all group cursor-pointer bg-white"
          >
            <span className="text-xs font-bold text-gray-600 group-hover:text-(--primary-color)">
              {slot.time}
            </span>
            <span className="text-[10px] text-gray-300 group-hover:text-(--primary-color)/80 font-medium">
              {isManual && slot.duration ? `${slot.duration} min` : "+ Zakaži"}
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
  onDayClick,
}: {
  weekStart: Date;
  appointments: PublicAppt[];
  workingHours: WorkingHoursMap | undefined;
  isManual: boolean;
  manualSlots?: ManualSlotsMap;
  selectedDate: Date;
  onDayClick: (day: Date) => void;
}) {
  const days = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
  });

  // Keep the highlighted day scrolled into view as the week changes, so the
  // colored column follows the arrows on narrow screens (the grid is forced
  // wider than the modal on mobile). Mirrors the day-strip recenter above.
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const activeIdx = (() => {
    const sel = days.findIndex((d) => isSameDay(d, selectedDate));
    if (sel !== -1) return sel;
    return days.findIndex((d) => isSameDay(d, new Date()));
  })();
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const btn = activeRef.current;
    if (!btn) {
      container.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    const delta =
      bRect.left - cRect.left - container.clientWidth / 2 + bRect.width / 2;
    container.scrollTo({
      left: container.scrollLeft + delta,
      behavior: "smooth",
    });
  }, [weekStart, selectedDate]);

  return (
    <div ref={scrollRef} className="overflow-x-auto -mx-1 px-1 pt-1.5 pb-2.5">
      <div className="grid grid-cols-7 gap-1 pb-3 sm:gap-1.5 min-w-[336px]">
        {days.map((day, i) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const range = getWorkingRange(workingHours, day);
          const manualForDay = isManual
            ? manualTimesForDate(manualSlots, dateStr)
            : [];
          const isWorking = isManual
            ? manualForDay.length > 0
            : range.isWorking;
          const slots = isManual
            ? manualForDay.map((s) => s.time)
            : range.isWorking
              ? generateSlots(range.start, range.end)
              : [];
          const fullyBooked =
            isWorking && isDayFullyBooked(appointments, slots, dateStr);
          const bookedCount = slots.filter((s) =>
            isSlotBooked(appointments, dateStr, s),
          ).length;
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={dateStr}
              ref={i === activeIdx ? activeRef : null}
              onClick={() => isWorking && onDayClick(day)}
              className={`flex flex-col items-center gap-1 p-1 sm:p-2 rounded-xl border-2 transition min-h-[72px] sm:min-h-[90px] ${
                !isWorking
                  ? "border-gray-300 bg-gray-100 cursor-default"
                  : isSelected
                    ? "border-(--primary-color) bg-(--primary-color)/10 cursor-pointer"
                    : isToday
                      ? "border-amber-300 bg-amber-50 cursor-pointer hover:border-(--primary-color)/30"
                      : "border-gray-200 bg-white cursor-pointer hover:border-(--primary-color)/30 hover:bg-(--primary-color)/10 shadow-sm"
              }`}
            >
              {/* Day header */}
              <div className="text-center">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wide ${
                    !isWorking
                      ? "text-gray-400"
                      : isToday
                        ? "text-amber-500"
                        : "text-gray-400"
                  }`}
                >
                  {format(day, "EEE", { locale: sr })}
                </span>
                <p
                  className={`text-sm font-bold leading-none mt-0.5 ${
                    !isWorking
                      ? "text-gray-400"
                      : isToday
                        ? "text-amber-600"
                        : isSelected
                          ? "text-(--primary-color)"
                          : "text-gray-700"
                  }`}
                >
                  {format(day, "d")}
                </p>
              </div>

              {/* Status — circle on mobile, text on sm+ */}
              {!isWorking ? (
                <>
                  <span className="sm:hidden w-2.5 h-2.5 rounded-full bg-gray-400 mt-auto mb-0.5" />
                  <span className="hidden sm:block text-[8px] text-gray-400 font-semibold text-center leading-tight">
                    Neradan
                  </span>
                </>
              ) : fullyBooked ? (
                <>
                  <span className="sm:hidden w-2.5 h-2.5 rounded-full bg-zinc-800 mt-auto mb-0.5" />
                  <span className="hidden sm:block text-[8px] bg-zinc-800 text-white font-semibold text-center px-1 py-0.5 rounded-md leading-tight">
                    Popunjeno
                  </span>
                </>
              ) : bookedCount > 0 ? (
                <>
                  <span className="sm:hidden w-2.5 h-2.5 rounded-full bg-(--primary-color) mt-auto mb-0.5" />
                  <span className="hidden sm:block text-[8px] text-(--primary-color) font-semibold text-center leading-tight">
                    {slots.length - bookedCount} slobodnih
                  </span>
                </>
              ) : (
                <>
                  <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-green-500 mt-auto mb-0.5" />
                  <span className="hidden sm:block text-[8px] text-green-500 font-semibold text-center leading-tight">
                    Slobodan
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  tenantSlug?: string;
  clientSlug?: string;
  salon: SalonProfileData;
  services: IService[];
}

type ViewMode = "week" | "day";

export default function HomepageAppointmentWidget({
  tenantSlug,
  clientSlug,
  salon,
  services,
}: Props) {
  const { user, token } = useAuth();
  const isLoggedIn = !!user;

  // On custom domains tenantSlug is undefined (it's only set for path-based dev URLs).
  // clientSlug is always the real DB slug — use it as the authoritative identifier.
  const effectiveSlug = clientSlug ?? tenantSlug;

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState("");
  const [modalTime, setModalTime] = useState("");
  const [pendingDefaults, setPendingDefaults] = useState<Omit<
    PendingAppointment,
    "tenantSlug"
  > | null>(null);

  // Day strip offset (for arrow navigation beyond the initial window)
  const [stripOffset, setStripOffset] = useState(-3); // days from today
  const stripScrollRef = useRef<HTMLDivElement>(null);
  const selectedDayRef = useRef<HTMLButtonElement>(null);
  // Set when a date change should recenter the strip — distinguishes a real
  // selection move from the strip's own browse arrows (which must NOT recenter).
  const pendingCenterRef = useRef(false);

  // ── Fetch public appointments ──────────────────────────────────────────────
  const { data: appointments = [], isLoading } = useQuery<PublicAppt[]>({
    queryKey: ["pub-appts-widget", effectiveSlug],
    queryFn: async () => {
      if (!effectiveSlug) return [];
      const res = await fetch(`/api/public/${effectiveSlug}/appointments`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!effectiveSlug,
    refetchInterval: 30_000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const workingHours = salon.workingHours as WorkingHoursMap | undefined;
  const isManual = salon.availabilityMode === "manualSlots";
  const manualSlots = salon.manualSlots as ManualSlotsMap | undefined;

  // ── Pending appointment restore on mount ───────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      const raw = sessionStorage.getItem(PENDING_STORAGE_KEY);
      if (!raw) return;
      const pending = JSON.parse(raw) as PendingAppointment;
      // Only restore if it matches this tenant
      if (pending.tenantSlug && clientSlug && pending.tenantSlug !== clientSlug)
        return;

      // Validate date is in the future
      const slotDt = new Date(`${pending.date}T${pending.time}`);
      if (slotDt < new Date()) {
        sessionStorage.removeItem(PENDING_STORAGE_KEY);
        return;
      }

      sessionStorage.removeItem(PENDING_STORAGE_KEY);
      async function handleChangeStates() {
        setPendingDefaults({
          date: pending.date,
          time: pending.time,
          serviceId: pending.serviceId,
          variantName: pending.variantName,
          extras: pending.extras,
          note: pending.note,
          totalPrice: pending.totalPrice,
          totalDuration: pending.totalDuration,
        });
        setModalDate(pending.date);
        setModalTime(pending.time);
        setModalOpen(true);
      }
      handleChangeStates();
      toast.success("Vaš termin je sačuvan — možete ga potvrditi.");
    } catch {
      /* ignore */
    }
  }, [isLoggedIn, clientSlug]);

  // ── Slot click handler ─────────────────────────────────────────────────────
  const handleSlotClick = useCallback((date: string, time: string) => {
    const slotDate = new Date(`${date}T${time}`);
    if (slotDate < new Date())
      return toast.error("Ne možete zakazati za prošli termin.");
    setModalDate(date);
    setModalTime(time);
    setPendingDefaults(null);
    setModalOpen(true);
  }, []);

  // ── Day click (week → day view) ────────────────────────────────────────────
  function handleDayClick(day: Date) {
    selectDate(day);
    setViewMode("day");
  }

  // ── Guest reserve: save to sessionStorage + redirect ──────────────────────
  function handleGuestConfirm(data: Omit<PendingAppointment, "tenantSlug">) {
    const pending: PendingAppointment = {
      ...data,
      tenantSlug: effectiveSlug ?? "",
    };
    try {
      sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending));
    } catch {
      /* ignore */
    }

    const isCustomDomain = detectCustomDomain();
    const base = isCustomDomain ? "" : clientSlug ? `/${clientSlug}` : "";
    const loginUrl = `${base}/login?pendingBooking=1`;
    window.location.href = loginUrl;
  }

  // ── Navigation label ───────────────────────────────────────────────────────
  const navLabel =
    viewMode === "week"
      ? `${format(weekStart, "d. MMM", { locale: sr })} – ${format(endOfWeek(weekStart, { weekStartsOn: 1 }), "d. MMM yyyy.", { locale: sr })}`
      : format(selectedDate, "EEEE, d. MMMM yyyy.", { locale: sr });

  // ── Day strip days ─────────────────────────────────────────────────────────
  const stripDays = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) =>
        addDays(new Date(), stripOffset + i),
      ),
    [stripOffset],
  );

  // Move the selection to a date: keep it inside the 14-day strip window and
  // flag the strip to recenter on it. Used by the day arrows, day buttons and
  // week→day drill-in — NOT the strip's own browse arrows.
  const selectDate = useCallback((date: Date) => {
    pendingCenterRef.current = true;
    setSelectedDate(date);
    setStripOffset((prev) => {
      const idx = differenceInCalendarDays(date, addDays(new Date(), prev));
      // Already in the window — keep the user's browse offset untouched.
      if (idx >= 0 && idx <= 13) return prev;
      // Re-anchor so the selected day sits ~3 from the left (matches "Danas").
      return differenceInCalendarDays(date, new Date()) - 3;
    });
  }, []);

  // Recenter the strip on the selected day once the window/layout settles. The
  // pending flag keeps the strip's own browse arrows (which only move the
  // window, not the selection) from snapping back to the selected day.
  useEffect(() => {
    if (!pendingCenterRef.current) return;
    pendingCenterRef.current = false;
    const container = stripScrollRef.current;
    const btn = selectedDayRef.current;
    if (!container || !btn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    const delta =
      bRect.left - cRect.left - container.clientWidth / 2 + bRect.width / 2;
    container.scrollTo({
      left: container.scrollLeft + delta,
      behavior: "smooth",
    });
  }, [stripOffset, selectedDate, viewMode]);

  return (
    <>
      <div className="space-y-4">
        {/* Calendar card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 w-full">
            {/* View toggle */}
            <div className="flex items-center gap-3 w-full justify-between lg:w-auto lg:justify-start mb-3">
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {(["week", "day"] as ViewMode[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      if (v === "day") selectDate(selectedDate);
                      setViewMode(v);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      viewMode === v
                        ? "bg-white text-(--primary-color) shadow-sm"
                        : "text-gray-400 hover:text-gray-700"
                    }`}
                  >
                    {v === "week" ? "Sedmica" : "Dan"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  const today = new Date();
                  pendingCenterRef.current = true;
                  setSelectedDate(today);
                  setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
                  setStripOffset(-3);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-(--primary-color)/20 text-(--primary-color) rounded-lg hover:bg-(--primary-color)/30 transition cursor-pointer"
              >
                Danas
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() =>
                  viewMode === "week"
                    ? setWeekStart((w) => subWeeks(w, 1))
                    : selectDate(subDays(selectedDate, 1))
                }
                className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-gray-800 min-w-[180px] text-center capitalize">
                {navLabel}
              </span>
              <button
                onClick={() =>
                  viewMode === "week"
                    ? setWeekStart((w) => addWeeks(w, 1))
                    : selectDate(addDays(selectedDate, 1))
                }
                className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Book CTA */}
            <button
              onClick={() => {
                setModalDate(format(selectedDate, "yyyy-MM-dd"));
                setModalTime("");
                setPendingDefaults(null);
                setModalOpen(true);
              }}
              className="px-4 py-2 bg-(--primary-color)/90 text-white text-xs font-bold rounded-xl hover:bg-(--primary-color) transition cursor-pointer"
            >
              + Zakaži termin
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm gap-2">
                <div className="w-4 h-4 border-2 border-(--primary-color)/30 border-t-(--primary-color) rounded-full animate-spin" />
                Učitavanje termina...
              </div>
            ) : viewMode === "week" ? (
              <WeekView
                weekStart={weekStart}
                appointments={appointments}
                workingHours={workingHours}
                isManual={isManual}
                manualSlots={manualSlots}
                selectedDate={selectedDate}
                onDayClick={handleDayClick}
              />
            ) : (
              <>
                {/* Day strip with arrows */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setStripOffset((o) => o - 1)}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                    aria-label="Prethodni dan"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>

                  <div
                    ref={stripScrollRef}
                    className="flex gap-1.5 overflow-x-auto px-0.5 pt-1.5 pb-2.5 flex-1 scrollbar-none"
                  >
                    {stripDays.map((day, i) => {
                      const isSelected = isSameDay(day, selectedDate);
                      const isToday = isSameDay(day, new Date());
                      const isWorking = isManual
                        ? manualTimesForDate(
                            manualSlots,
                            format(day, "yyyy-MM-dd"),
                          ).length > 0
                        : getWorkingRange(workingHours, day).isWorking;
                      return (
                        <button
                          key={i}
                          ref={isSelected ? selectedDayRef : null}
                          onClick={() => selectDate(day)}
                          className={`flex flex-col items-center flex-shrink-0 w-11 h-14 rounded-xl border-2 transition cursor-pointer ${
                            isSelected
                              ? "bg-(--primary-color) border-(--primary-color) text-white"
                              : isToday
                                ? "border-amber-300 bg-amber-50 text-amber-700"
                                : !isWorking
                                  ? "border-gray-300 bg-gray-100 text-gray-400"
                                  : "border-gray-200 bg-white text-gray-600 hover:border-(--primary-color)/30"
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

                  <button
                    onClick={() => setStripOffset((o) => o + 1)}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                    aria-label="Sledeći dan"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>

                <DayView
                  selectedDate={selectedDate}
                  appointments={appointments}
                  workingHours={workingHours}
                  isManual={isManual}
                  manualSlots={manualSlots}
                  onSlotClick={handleSlotClick}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPendingDefaults(null);
        }}
        defaultDate={modalDate}
        defaultTime={modalTime}
        services={services}
        isLoggedIn={isLoggedIn}
        userName={user?.name}
        userEmail={user?.email}
        token={token ?? undefined}
        tenantSlug={effectiveSlug}
        onConfirmedByGuest={handleGuestConfirm}
        pendingDefaults={pendingDefaults}
        availabilityMode={salon.availabilityMode}
        manualSlots={manualSlots}
        bookedAppointments={appointments}
      />
    </>
  );
}
