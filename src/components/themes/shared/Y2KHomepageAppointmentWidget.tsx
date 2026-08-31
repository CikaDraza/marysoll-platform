/**
 * Y2KHomepageAppointmentWidget — Y2K-restyled public appointment calendar.
 *
 * Functionally identical to shared/HomepageAppointmentWidget (week + day view,
 * live availability via react-query, working-hours aware slots, BookingModal,
 * guest→sessionStorage→login flow, pending-restore on mount). Only the markup
 * is restyled to the Theme-8 Y2K aesthetic (thick ink borders, hard offset
 * shadows, hot-pink active states). Used by tenants who choose Theme-8.
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
  parseISO,
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
  IService,
  IVacation,
  SalonProfileData,
  ManualSlotsMap,
} from "@/types";
import { firstAvailableDate, widgetDay } from "@/lib/booking/widgetDay";
import { useTheme8Modal } from "@/components/themes/theme-8/theme8ModalContext";
import { useBookingLauncher } from "./BookingLauncher";

// ─── Types ────────────────────────────────────────────────────────────────────

type PublicAppt = {
  _id: string;
  date: string;
  time: string;
  duration: number;
  serviceName: string;
  status: string;
};

// ─── DayView ──────────────────────────────────────────────────────────────────

function DayView({
  selectedDate,
  appointments,
  workingHours,
  isManual,
  manualSlots,
  vacations,
  onSlotClick,
}: {
  selectedDate: Date;
  appointments: PublicAppt[];
  workingHours: WorkingHoursMap | undefined;
  isManual: boolean;
  manualSlots?: ManualSlotsMap;
  vacations?: IVacation[];
  onSlotClick: (date: string, time: string) => void;
}) {
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const day = widgetDay(dateStr, {
    workingHours,
    manualSlots,
    isManual,
    appointments,
    vacations,
  });
  const { isWorking, slots } = day;

  if (!isWorking) {
    // Radnim danima (pon–pet) bez termina piše "popunjeno" — "ne radi" zbunjuje
    // klijente kad salon inače radi tim danom; vikendom ostaje "ne radi".
    const isWeekend = getDay(selectedDate) === 0 || getDay(selectedDate) === 6;
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 rounded-2xl border-[3px] border-y2k-ink bg-y2k-pink/10 text-y2k-ink/70">
        <span className="text-2xl">🔒</span>
        <span className="text-sm font-extrabold">
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
        const booked = slot.taken;
        const isPast = slot.past;

        if (booked) {
          return (
            <div
              key={slot.time}
              className="flex flex-col items-center justify-center gap-0.5 px-3 py-3 rounded-xl bg-y2k-ink border-[3px] border-y2k-ink text-white select-none"
              title="Termin zauzet"
            >
              <span className="text-xs font-extrabold">{slot.time}</span>
              <span className="text-[10px] opacity-60 font-bold">Zauzeto</span>
            </div>
          );
        }

        if (isPast) {
          return (
            <div
              key={slot.time}
              className="flex flex-col items-center justify-center px-3 py-3 rounded-xl border-2 border-dashed border-y2k-ink/20 opacity-30 select-none"
            >
              <span className="text-xs font-extrabold text-y2k-ink/40">
                {slot.time}
              </span>
            </div>
          );
        }

        return (
          <button
            key={slot.time}
            onClick={() => onSlotClick(dateStr, slot.time)}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-3 rounded-xl border-[3px] border-y2k-ink bg-white hover:bg-y2k-pink hover:text-white transition-all group cursor-pointer shadow-[2px_2px_0_#0b0b0f] hover:shadow-[3px_3px_0_#0b0b0f]"
          >
            <span className="text-xs font-extrabold text-y2k-ink group-hover:text-white">
              {slot.time}
            </span>
            <span className="text-[10px] text-y2k-ink/40 group-hover:text-white/90 font-bold">
              {isManual ? `${slot.durationMinutes} min` : "+ Zakaži"}
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
  vacations,
  selectedDate,
  onDayClick,
}: {
  weekStart: Date;
  appointments: PublicAppt[];
  workingHours: WorkingHoursMap | undefined;
  isManual: boolean;
  manualSlots?: ManualSlotsMap;
  vacations?: IVacation[];
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
    <div ref={scrollRef} className="overflow-x-auto -mx-1 px-1">
      <div className="grid grid-cols-7 gap-1 pb-3 sm:gap-1.5 min-w-[336px]">
        {days.map((day, i) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const { isWorking, fullyBooked, bookedCount, slots } = widgetDay(
            dateStr,
            { workingHours, manualSlots, isManual, appointments, vacations },
          );
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={dateStr}
              ref={i === activeIdx ? activeRef : null}
              onClick={() => isWorking && onDayClick(day)}
              className={`flex flex-col items-center gap-1 p-1 sm:p-2 rounded-xl border-[3px] transition min-h-[72px] sm:min-h-[90px] ${
                !isWorking
                  ? "border-y2k-ink/20 bg-y2k-pink/5 cursor-default"
                  : isSelected
                    ? "border-y2k-ink bg-y2k-pink text-white cursor-pointer shadow-[3px_3px_0_#0b0b0f]"
                    : isToday
                      ? "border-y2k-purple bg-y2k-purple/10 cursor-pointer"
                      : "border-y2k-ink bg-white cursor-pointer hover:bg-y2k-pink/10 shadow-[2px_2px_0_#0b0b0f]"
              }`}
            >
              <div className="text-center">
                <span
                  className={`text-[9px] font-extrabold uppercase tracking-wide ${
                    !isWorking
                      ? "text-y2k-ink/30"
                      : isSelected
                        ? "text-white/80"
                        : isToday
                          ? "text-y2k-purple"
                          : "text-y2k-ink/50"
                  }`}
                >
                  {format(day, "EEE", { locale: sr })}
                </span>
                <p
                  className={`text-sm font-extrabold leading-none mt-0.5 ${
                    !isWorking
                      ? "text-y2k-ink/30"
                      : isSelected
                        ? "text-white"
                        : isToday
                          ? "text-y2k-purple"
                          : "text-y2k-ink"
                  }`}
                >
                  {format(day, "d")}
                </p>
              </div>

              {!isWorking ? (
                <>
                  <span className="sm:hidden w-2.5 h-2.5 rounded-full bg-y2k-ink/30 mt-auto mb-0.5" />
                  <span className="hidden sm:block text-[8px] text-y2k-ink/40 font-bold text-center leading-tight">
                    Neradan
                  </span>
                </>
              ) : fullyBooked ? (
                <>
                  <span className="sm:hidden w-2.5 h-2.5 rounded-full bg-y2k-ink mt-auto mb-0.5" />
                  <span className="hidden sm:block text-[8px] bg-y2k-ink text-white font-bold text-center px-1 py-0.5 rounded-md leading-tight">
                    Popunjeno
                  </span>
                </>
              ) : bookedCount > 0 ? (
                <>
                  <span
                    className={`sm:hidden w-2.5 h-2.5 rounded-full mt-auto mb-0.5 ${isSelected ? "bg-white" : "bg-y2k-pink"}`}
                  />
                  <span
                    className={`hidden sm:block text-[8px] font-bold text-center leading-tight ${isSelected ? "text-white" : "text-y2k-pink"}`}
                  >
                    {slots.length - bookedCount} slobodnih
                  </span>
                </>
              ) : (
                <>
                  <span
                    className={`sm:hidden w-1.5 h-1.5 rounded-full mt-auto mb-0.5 ${isSelected ? "bg-white" : "bg-y2k-purple"}`}
                  />
                  <span
                    className={`hidden sm:block text-[8px] font-bold text-center leading-tight ${isSelected ? "text-white" : "text-y2k-purple"}`}
                  >
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

export default function Y2KHomepageAppointmentWidget({
  tenantSlug,
  clientSlug,
  salon,
  services,
}: Props) {
  const { user, token } = useAuth();
  const isLoggedIn = !!user;
  const { celebrate } = useTheme8Modal();

  const effectiveSlug = clientSlug ?? tenantSlug;

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  // Fokus (dan / sedmica / traka dana) je "korisnikov izbor ILI auto-fokus":
  // dok je korisnički izbor `null`, prikaz prati prvi slobodan dan koji se
  // izračuna čim stignu termini. Svaka korisnička akcija upisuje konkretan
  // datum i od tada auto-fokus više ne pomera prikaz.
  const [userDate, setUserDate] = useState<Date | null>(null);
  const [userWeekStart, setUserWeekStart] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState("");
  const [modalTime, setModalTime] = useState("");
  const [pendingDefaults, setPendingDefaults] = useState<Omit<
    PendingAppointment,
    "tenantSlug"
  > | null>(null);

  const [userStripOffset, setUserStripOffset] = useState<number | null>(null);
  const stripScrollRef = useRef<HTMLDivElement>(null);
  const selectedDayRef = useRef<HTMLButtonElement>(null);
  // Set when a date change should recenter the strip — distinguishes a real
  // selection move from the strip's own browse arrows (which must NOT recenter).
  const pendingCenterRef = useRef(false);

  // ── Fetch public appointments ──────────────────────────────────────────────
  const { data: appointments = [], isLoading, refetch } = useQuery<PublicAppt[]>({
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
  // Odmori su bili u javnom profilu, ali ih widget nije prosleđivao.
  const vacations = salon.vacations;

  // ── Auto-fokus na prvi slobodan dan ────────────────────────────────────────
  // Ako današnji dan nema nijedan slobodan termin (npr. sve popunjeno nedelju
  // dana unapred), prikaz se sam pomera na prvi dan koji ima slobodan termin —
  // klijent ne mora da traži gde ima mesta. Važi za oba režima dostupnosti
  // (radno vreme i pojedinačni termini). Dugme "Danas" i dalje vraća na danas.
  const today = useMemo(() => new Date(), []);
  const autoFocusDay = useMemo(() => {
    if (isLoading) return null;
    const firstFree = firstAvailableDate(
      { workingHours, manualSlots, isManual, appointments, vacations },
      format(today, "yyyy-MM-dd"),
    );
    if (!firstFree) return null;
    const firstFreeDay = parseISO(firstFree);
    return isSameDay(firstFreeDay, today) ? null : firstFreeDay;
  }, [
    isLoading,
    appointments,
    workingHours,
    manualSlots,
    isManual,
    vacations,
    today,
  ]);

  const selectedDate = userDate ?? autoFocusDay ?? today;
  const weekStart = useMemo(
    () =>
      userWeekStart ?? startOfWeek(autoFocusDay ?? today, { weekStartsOn: 1 }),
    [userWeekStart, autoFocusDay, today],
  );
  const stripOffset =
    userStripOffset ??
    (autoFocusDay ? differenceInCalendarDays(autoFocusDay, today) - 3 : -3);

  // ── Pending appointment restore on mount ───────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      const raw = sessionStorage.getItem(PENDING_STORAGE_KEY);
      if (!raw) return;
      const pending = JSON.parse(raw) as PendingAppointment;
      if (pending.tenantSlug && clientSlug && pending.tenantSlug !== clientSlug)
        return;

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
          voucherCode: pending.voucherCode,
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


  // ── Hero CTA „Zakaži odmah" ───────────────────────────────────────────────
  // Klasičan režim: otvori modal odmah — datum i vreme se biraju u njemu.
  // Ručni režim (`manualSlots`): modal bez izabranog termina je ćorsokak
  // ("Zatvorite prozor i izaberite slobodan termin"), pa CTA umesto toga
  // skroluje do kalendara gde su ponuđeni termini.
  const { register } = useBookingLauncher();
  useEffect(() => {
    return register(() => {
      if (salon.availabilityMode === "manualSlots") {
        document
          .getElementById("booking")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      setPendingDefaults(null);
      setModalDate("");
      setModalTime("");
      setModalOpen(true);
    });
  }, [register, salon.availabilityMode]);

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
  function handleGuestConfirm(
    data: Omit<PendingAppointment, "tenantSlug">,
    destination: "login" | "register" = "login",
  ) {
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
    window.location.href = `${base}/${destination}?pendingBooking=1`;
  }

  // ── Navigation label ───────────────────────────────────────────────────────
  const navLabel =
    viewMode === "week"
      ? `${format(weekStart, "d. MMM", { locale: sr })} – ${format(endOfWeek(weekStart, { weekStartsOn: 1 }), "d. MMM yyyy.", { locale: sr })}`
      : format(selectedDate, "EEEE, d. MMMM yyyy.", { locale: sr });

  // ── Day strip days ─────────────────────────────────────────────────────────
  const stripDays = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => addDays(today, stripOffset + i)),
    [stripOffset, today],
  );

  // Move the selection to a date: keep it inside the 14-day strip window and
  // flag the strip to recenter on it. Used by the day arrows, day buttons and
  // week→day drill-in — NOT the strip's own browse arrows.
  const selectDate = useCallback(
    (date: Date) => {
      pendingCenterRef.current = true;
      setUserDate(date);
      const idx = differenceInCalendarDays(date, addDays(today, stripOffset));
      // Van trenutnog prozora — re-anchor tako da izabrani dan stoji ~3 mesta
      // od leve ivice (isto kao "Danas"); u prozoru ostaje kako korisnik gleda.
      if (idx < 0 || idx > 13)
        setUserStripOffset(differenceInCalendarDays(date, today) - 3);
    },
    [stripOffset, today],
  );

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
        <div className="bg-white rounded-2xl border-[3px] border-y2k-ink shadow-[4px_5px_0_#0b0b0f] overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b-2 border-y2k-ink/15 w-full">
            <div className="flex items-center gap-3 w-full justify-between lg:w-auto lg:justify-start mb-3">
              <div className="flex items-center gap-1 bg-y2k-pink/10 rounded-xl p-1 border-2 border-y2k-ink/15">
                {(["week", "day"] as ViewMode[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      if (v === "day") selectDate(selectedDate);
                      setViewMode(v);
                    }}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                      viewMode === v
                        ? "bg-y2k-pink text-white shadow-[2px_2px_0_#0b0b0f]"
                        : "text-y2k-ink/50 hover:text-y2k-ink"
                    }`}
                  >
                    {v === "week" ? "Sedmica" : "Dan"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  // "Danas" ostaje nepromenjen: vraća fokus na današnji dan i
                  // gasi auto-fokus (korisnički izbor od sada ima prednost).
                  pendingCenterRef.current = true;
                  setUserDate(today);
                  setUserWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
                  setUserStripOffset(-3);
                }}
                className="px-3 py-1.5 text-xs font-extrabold bg-y2k-purple/15 text-y2k-purple rounded-lg hover:bg-y2k-purple/25 transition cursor-pointer"
              >
                Danas
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() =>
                  viewMode === "week"
                    ? setUserWeekStart(subWeeks(weekStart, 1))
                    : selectDate(subDays(selectedDate, 1))
                }
                className="p-1.5 rounded-lg hover:bg-y2k-pink/10 transition text-y2k-ink/50 hover:text-y2k-ink cursor-pointer"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-sm font-extrabold text-y2k-ink min-w-[180px] text-center capitalize">
                {navLabel}
              </span>
              <button
                onClick={() =>
                  viewMode === "week"
                    ? setUserWeekStart(addWeeks(weekStart, 1))
                    : selectDate(addDays(selectedDate, 1))
                }
                className="p-1.5 rounded-lg hover:bg-y2k-pink/10 transition text-y2k-ink/50 hover:text-y2k-ink cursor-pointer"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Body */}
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-y2k-ink/50 text-sm gap-2">
                <div className="w-4 h-4 border-2 border-y2k-pink/30 border-t-y2k-pink rounded-full animate-spin" />
                Učitavanje termina...
              </div>
            ) : viewMode === "week" ? (
              <WeekView
                weekStart={weekStart}
                appointments={appointments}
                workingHours={workingHours}
                vacations={vacations}
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
                    onClick={() => setUserStripOffset(stripOffset - 1)}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-y2k-pink/10 text-y2k-ink/50 hover:text-y2k-ink transition cursor-pointer"
                    aria-label="Prethodni dan"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>

                  <div
                    ref={stripScrollRef}
                    className="flex gap-1.5 overflow-x-auto pb-1 flex-1 scrollbar-none"
                  >
                    {stripDays.map((day, i) => {
                      const isSelected = isSameDay(day, selectedDate);
                      const isToday = isSameDay(day, new Date());
                      const isWorking = widgetDay(format(day, "yyyy-MM-dd"), {
                        workingHours,
                        manualSlots,
                        isManual,
                        appointments,
                        vacations,
                      }).isWorking;
                      return (
                        <button
                          key={i}
                          ref={isSelected ? selectedDayRef : null}
                          onClick={() => selectDate(day)}
                          className={`flex flex-col items-center flex-shrink-0 w-11 h-14 rounded-xl border-[3px] transition cursor-pointer ${
                            isSelected
                              ? "bg-y2k-pink border-y2k-ink text-white shadow-[2px_2px_0_#0b0b0f]"
                              : isToday
                                ? "border-y2k-purple bg-y2k-purple/10 text-y2k-purple"
                                : !isWorking
                                  ? "border-y2k-ink/20 bg-y2k-pink/5 text-y2k-ink/30"
                                  : "border-y2k-ink bg-white text-y2k-ink hover:bg-y2k-pink/10"
                          }`}
                        >
                          <span className="text-[9px] uppercase font-extrabold mt-2">
                            {format(day, "EEE", { locale: sr })}
                          </span>
                          <span className="text-sm font-extrabold">
                            {format(day, "d")}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setUserStripOffset(stripOffset + 1)}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-y2k-pink/10 text-y2k-ink/50 hover:text-y2k-ink transition cursor-pointer"
                    aria-label="Sledeći dan"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>

                <DayView
                  selectedDate={selectedDate}
                  appointments={appointments}
                  workingHours={workingHours}
                  vacations={vacations}
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
        workingHours={workingHours}
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
        onBooked={() => {
          // BookingModal se sam zatvara (handleClose). Osveži dostupnost i
          // pusti "Moment" zahvalnicu preko cele strane (Y2K).
          refetch();
          celebrate();
        }}
        pendingDefaults={pendingDefaults}
        availabilityMode={salon.availabilityMode}
        manualSlots={manualSlots}
        bookedAppointments={appointments}
      />
    </>
  );
}
