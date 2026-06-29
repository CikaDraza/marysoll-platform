"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { parseDaySlots } from "@/helpers/parseWorkingHours";
import { SLOT_STATE } from "@/lib/appointmentColors";
import { useAuth } from "@/hooks/useAuth";
import { detectCustomDomain } from "@/hooks/useClientRouting";
import { BookingModal, PENDING_STORAGE_KEY } from "@/components/shared/BookingModal";
import type { PendingAppointment } from "@/components/shared/BookingModal";
import toast from "react-hot-toast";
import type { IAppointment, IService, SalonProfileData } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOT_MIN = 30;

const DAY_NUM_TO_SR: Record<number, string> = {
  0: "Nedelja",
  1: "Ponedeljak",
  2: "Utorak",
  3: "Sreda",
  4: "Četvrtak",
  5: "Petak",
  6: "Subota",
};

const DAY_SHORT = ["Ned", "Pon", "Uto", "Sre", "Čet", "Pet", "Sub"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PublicAppt = Pick<IAppointment, "_id" | "date" | "time" | "duration">;

type Props = {
  initialAppointments: IAppointment[];
  salonProfile: SalonProfileData;
  tenantSlug: string;
  clientSlug?: string;
  services: IService[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppointmentCalendarPage({
  initialAppointments,
  salonProfile,
  tenantSlug,
  clientSlug,
  services,
}: Props) {
  const { user, token } = useAuth();
  const isLoggedIn = !!user;

  // U "manualSlots" režimu termini su raštrkani po danu — dnevni prikaz čita prirodnije.
  const [view, setView] = useState<"week" | "day">(
    salonProfile.availabilityMode === "manualSlots" ? "day" : "week",
  );
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState("");
  const [modalTime, setModalTime] = useState("");
  const [pendingDefaults, setPendingDefaults] = useState<Omit<
    PendingAppointment,
    "tenantSlug"
  > | null>(null);

  // Real-time polling — refresh every 30 s (plus an immediate refetch on booking)
  const { data: appointments = [], refetch } = useQuery<PublicAppt[]>({
    queryKey: ["pub-appts", tenantSlug],
    queryFn: async () => {
      const res = await fetch(`/api/public/${tenantSlug}/appointments`);
      if (!res.ok) return [];
      return res.json();
    },
    initialData: initialAppointments as PublicAppt[],
    refetchInterval: 30_000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const workingHours = salonProfile.workingHours as
    | Record<string, unknown>
    | undefined;

  const isManual = salonProfile.availabilityMode === "manualSlots";
  const manualSlotsMap = (salonProfile.manualSlots ?? {}) as Record<
    string,
    { time: string; duration: number; serviceId?: string }[]
  >;

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
      async function restorePending() {
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
      restorePending();
      toast.success("Vaš termin je sačuvan — možete ga potvrditi.");
    } catch {
      /* ignore */
    }
  }, [isLoggedIn, clientSlug]);

  // ── Derive grid time range from working hours ──────────────────────────────
  const { gridStart, gridEnd } = useMemo(() => {
    if (!workingHours) return { gridStart: 8 * 60, gridEnd: 20 * 60 };
    let s = 24 * 60,
      e = 0;
    for (const v of Object.values(workingHours)) {
      for (const slot of parseDaySlots(v)) {
        s = Math.min(s, timeToMin(slot.from));
        e = Math.max(e, timeToMin(slot.to));
      }
    }
    return {
      gridStart: s === 24 * 60 ? 8 * 60 : s,
      gridEnd: e === 0 ? 20 * 60 : e,
    };
  }, [workingHours]);

  const timeSlots = useMemo(() => {
    const slots: number[] = [];
    for (let m = gridStart; m < gridEnd; m += SLOT_MIN) slots.push(m);
    return slots;
  }, [gridStart, gridEnd]);

  const days = useMemo(() => {
    if (view === "day") return [selectedDay];
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [view, weekStart, selectedDay]);

  const todayStr = useMemo(() => toDateStr(new Date()), []);

  // ── Working hours helpers ──────────────────────────────────────────────────
  function getDaySlots(srName: string) {
    if (!workingHours) return [];
    return parseDaySlots(workingHours[srName]);
  }

  function isInWorkingHours(srName: string, slotMin: number): boolean {
    return getDaySlots(srName).some(
      (s) => slotMin >= timeToMin(s.from) && slotMin < timeToMin(s.to),
    );
  }

  // ── Booked slot helpers ────────────────────────────────────────────────────
  function isBooked(dateStr: string, slotMin: number): boolean {
    return appointments.some((appt) => {
      if (appt.date !== dateStr) return false;
      const start = timeToMin(appt.time);
      const end = start + (appt.duration || 60);
      return slotMin >= start && slotMin < end;
    });
  }

  function isBookedBlockStart(
    dateStr: string,
    slotMin: number,
    srName: string,
  ): boolean {
    if (!isBooked(dateStr, slotMin)) return false;
    const prev = slotMin - SLOT_MIN;
    return (
      prev < gridStart ||
      !isBooked(dateStr, prev) ||
      !isInWorkingHours(srName, prev)
    );
  }

  // ── Manual slots helpers (availabilityMode === "manualSlots") ──────────────
  function manualSlotsFor(
    dateStr: string,
  ): { time: string; duration: number }[] {
    const list = manualSlotsMap[dateStr];
    if (!Array.isArray(list)) return [];
    return [...list]
      .filter((s) => s && typeof s.time === "string")
      .sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
  }

  function isManualSlotTaken(
    dateStr: string,
    startMin: number,
    dur: number,
  ): boolean {
    const end = startMin + dur;
    return appointments.some((appt) => {
      if (appt.date !== dateStr) return false;
      const s = timeToMin(appt.time);
      const e = s + (appt.duration || 60);
      return startMin < e && end > s;
    });
  }

  // ── Slot click ─────────────────────────────────────────────────────────────
  const handleSlotClick = useCallback(
    (dateStr: string, slotMin: number) => {
      const time = minToTime(slotMin);
      const slotDt = new Date(`${dateStr}T${time}`);
      if (slotDt.getTime() < Date.now())
        return toast.error("Ne možete zakazati za prošli termin.");
      setModalDate(dateStr);
      setModalTime(time);
      setPendingDefaults(null);
      setModalOpen(true);
    },
    [],
  );

  // ── Guest reserve: save to sessionStorage + redirect ──────────────────────
  function handleGuestConfirm(data: Omit<PendingAppointment, "tenantSlug">) {
    const pending: PendingAppointment = {
      ...data,
      tenantSlug: clientSlug ?? tenantSlug ?? "",
    };
    try {
      sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending));
    } catch {
      /* ignore */
    }
    const isCustomDomain = detectCustomDomain();
    const base = isCustomDomain ? "" : clientSlug ? `/${clientSlug}` : "";
    window.location.href = `${base}/login?pendingBooking=1`;
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const navPrev = () => {
    if (view === "week") setWeekStart((d) => addDays(d, -7));
    else setSelectedDay((d) => addDays(d, -1));
  };
  const navNext = () => {
    if (view === "week") setWeekStart((d) => addDays(d, 7));
    else setSelectedDay((d) => addDays(d, 1));
  };
  const navToday = () => {
    setWeekStart(getMonday(new Date()));
    setSelectedDay(new Date());
  };

  const weekEnd = addDays(weekStart, 6);
  const title =
    view === "week"
      ? `${weekStart.getDate()}.${weekStart.getMonth() + 1}. – ${weekEnd.getDate()}.${weekEnd.getMonth() + 1}. ${weekStart.getFullYear()}`
      : `${DAY_SHORT[selectedDay.getDay()]}, ${selectedDay.getDate()}.${selectedDay.getMonth() + 1}. ${selectedDay.getFullYear()}`;

  const colCount = days.length;
  const now = new Date();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-1">
            <button
              onClick={navPrev}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-700 px-2 min-w-[180px] text-center">
              {title}
            </span>
            <button
              onClick={navNext}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            <button
              onClick={navToday}
              className="ml-2 px-3 py-1 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition cursor-pointer"
            >
              Danas
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Book CTA */}
            <button
              onClick={() => {
                setModalDate(toDateStr(selectedDay));
                setModalTime("");
                setPendingDefaults(null);
                setModalOpen(true);
              }}
              className="px-4 py-2 bg-(--primary-color)/90 text-white text-xs font-bold rounded-xl hover:bg-(--primary-color) transition cursor-pointer"
            >
              + Zakaži termin
            </button>

            {/* View toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(["week", "day"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                    view === v
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {v === "week" ? "Sedmica" : "Dan"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar grid — manual mode renders discrete slot chips per day */}
        {isManual ? (
          <div className="overflow-x-auto">
            <div style={{ minWidth: view === "week" ? "640px" : "300px" }}>
              <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
              >
                {days.map((day, di) => {
                  const dateStr = toDateStr(day);
                  const isToday = dateStr === todayStr;
                  const slots = manualSlotsFor(dateStr);
                  return (
                    <div
                      key={di}
                      className="border-l border-gray-200 min-h-[220px]"
                    >
                      <div
                        className={`py-2 px-1 text-center border-b border-gray-100 ${isToday ? "bg-[#fffbf0]" : "bg-white"}`}
                      >
                        <div
                          className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? "text-amber-600" : "text-gray-400"}`}
                        >
                          {DAY_SHORT[day.getDay()]}
                        </div>
                        <div
                          className={`text-lg font-bold leading-none mt-0.5 ${isToday ? "text-amber-700" : "text-gray-800"}`}
                        >
                          {day.getDate()}
                        </div>
                        <div
                          className={`text-[9px] font-semibold mt-0.5 ${slots.length > 0 ? "text-green-600" : "text-red-400"}`}
                        >
                          {slots.length > 0 ? "Radi" : "Neradan"}
                        </div>
                      </div>
                      <div className="p-2 space-y-2">
                        {slots.length === 0 && (
                          <div className="text-center text-[11px] text-gray-300 py-6 select-none">
                            —
                          </div>
                        )}
                        {slots.map((slot, si) => {
                          const startMin = timeToMin(slot.time);
                          const taken = isManualSlotTaken(
                            dateStr,
                            startMin,
                            slot.duration,
                          );
                          const isPast =
                            new Date(`${dateStr}T${slot.time}`) < now;
                          if (taken || isPast) {
                            return (
                              <div
                                key={si}
                                className={`rounded-xl px-2 py-2 text-center select-none ${
                                  taken ? SLOT_STATE.busy.fill : SLOT_STATE.past.fill
                                }`}
                              >
                                <span className="text-xs font-bold">
                                  {slot.time}
                                </span>
                                <span className="block text-[9px] font-semibold">
                                  {taken ? "Zauzeto" : "Prošlo"}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <button
                              key={si}
                              onClick={() => handleSlotClick(dateStr, startMin)}
                              className="w-full rounded-xl border px-2 py-2 text-center bg-white border-gray-200 hover:bg-(--primary-color)/10 hover:border-(--primary-color)/40 transition cursor-pointer group"
                              title={`Zakaži ${slot.time}`}
                            >
                              <span className="text-xs font-bold text-gray-800 group-hover:text-(--primary-color)">
                                {slot.time}
                              </span>
                              <span className="block text-[9px] font-semibold text-gray-400">
                                {slot.duration} min
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: view === "week" ? "640px" : "300px" }}>
            {/* Day header row */}
            <div
              className="grid sticky top-0 z-10 bg-white border-b border-gray-100"
              style={{
                gridTemplateColumns: `56px repeat(${colCount}, 1fr)`,
              }}
            >
              <div className="bg-white" />
              {days.map((day, i) => {
                const srName = DAY_NUM_TO_SR[day.getDay()];
                const working = getDaySlots(srName).length > 0;
                const isToday = toDateStr(day) === todayStr;
                return (
                  <div
                    key={i}
                    className={`py-2 px-1 text-center border-l border-gray-200 ${
                      isToday ? "bg-[#fffbf0]" : "bg-white"
                    }`}
                  >
                    <div
                      className={`text-[10px] font-bold uppercase tracking-widest ${
                        isToday ? "text-amber-600" : "text-gray-400"
                      }`}
                    >
                      {DAY_SHORT[day.getDay()]}
                    </div>
                    <div
                      className={`text-lg font-bold leading-none mt-0.5 ${
                        isToday ? "text-amber-700" : "text-gray-800"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    <div
                      className={`text-[9px] font-semibold mt-0.5 ${
                        working ? "text-green-600" : "text-red-400"
                      }`}
                    >
                      {working ? "Radi" : "Neradan"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time rows */}
            <div className="overflow-y-auto" style={{ maxHeight: "560px" }}>
              {timeSlots.map((slotMin) => {
                const showHourLine = slotMin % 60 === 0;
                return (
                  <div
                    key={slotMin}
                    className="grid"
                    style={{
                      gridTemplateColumns: `56px repeat(${colCount}, 1fr)`,
                    }}
                  >
                    {/* Time label */}
                    <div
                      className={`flex items-start justify-end pr-2 pt-0.5 bg-white ${
                        showHourLine
                          ? "border-t border-gray-200"
                          : "border-t border-gray-50"
                      }`}
                      style={{ height: "32px" }}
                    >
                      {showHourLine && (
                        <span className="text-[10px] text-gray-400 font-medium -translate-y-1.5 select-none">
                          {minToTime(slotMin)}
                        </span>
                      )}
                    </div>

                    {/* Day cells */}
                    {days.map((day, di) => {
                      const dateStr = toDateStr(day);
                      const srName = DAY_NUM_TO_SR[day.getDay()];
                      const working = isInWorkingHours(srName, slotMin);
                      const isToday = dateStr === todayStr;
                      const booked = working && isBooked(dateStr, slotMin);
                      const blockStart =
                        booked && isBookedBlockStart(dateStr, slotMin, srName);
                      const isPast =
                        new Date(`${dateStr}T${minToTime(slotMin)}`) < now;
                      const isAvailable = working && !booked && !isPast;

                      let bg: string;
                      if (!working) {
                        bg = "bg-gray-100"; // SLOT_STATE.nonWorking
                      } else if (booked) {
                        bg = "bg-zinc-800"; // SLOT_STATE.busy
                      } else if (isPast) {
                        bg = isToday ? "bg-[#fffbf0]" : "bg-white";
                      } else {
                        bg = isToday ? "bg-[#fffbf0]" : "bg-white";
                      }

                      if (isAvailable) {
                        return (
                          <button
                            key={di}
                            onClick={() => handleSlotClick(dateStr, slotMin)}
                            className={`relative border-l border-gray-200 ${
                              showHourLine
                                ? "border-t border-gray-200"
                                : "border-t border-gray-50"
                            } ${bg} hover:bg-(--primary-color)/10 hover:border-(--primary-color)/30 group transition-colors cursor-pointer w-full`}
                            style={{ height: "32px" }}
                            title={`Zakaži ${minToTime(slotMin)}`}
                          >
                            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[9px] font-bold text-(--primary-color)">
                                + Zakaži
                              </span>
                            </span>
                          </button>
                        );
                      }

                      return (
                        <div
                          key={di}
                          className={`relative border-l border-gray-200 ${
                            showHourLine
                              ? "border-t border-gray-200"
                              : "border-t border-gray-50"
                          } ${bg}`}
                          style={{ height: "32px", userSelect: "none" }}
                        >
                          {blockStart && (
                            <span className="absolute left-1.5 top-0.5 text-[9px] text-white/80 font-semibold leading-none select-none">
                              Zauzeto
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 px-4 py-2.5 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-gray-300 bg-white inline-block" />
            <span className="text-[11px] font-medium text-gray-700">
              Slobodan termin
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-zinc-800 border border-zinc-800 inline-block" />
            <span className="text-[11px] font-medium text-gray-700">Zauzeto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300 inline-block" />
            <span className="text-[11px] font-medium text-gray-700">
              Salon ne radi
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#fffbf0] border border-amber-300 inline-block" />
            <span className="text-[11px] font-medium text-gray-700">Danas</span>
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
        tenantSlug={tenantSlug}
        onConfirmedByGuest={handleGuestConfirm}
        onBooked={() => refetch()}
        pendingDefaults={pendingDefaults}
      />
    </>
  );
}
