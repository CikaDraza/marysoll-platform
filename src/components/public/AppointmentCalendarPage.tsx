"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { parseDaySlots } from "@/helpers/parseWorkingHours";
import type { IAppointment, SalonProfileData } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOT_MIN = 30; // minutes per row

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
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppointmentCalendarPage({
  initialAppointments,
  salonProfile,
  tenantSlug,
}: Props) {
  const [view, setView] = useState<"week" | "day">("week");
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Real-time polling — refresh every 30 s
  const { data: appointments = [] } = useQuery<PublicAppt[]>({
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

  // Returns true if this is the first booked slot in a continuous block
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
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

      {/* Calendar grid */}
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
                  className={`py-2 px-1 text-center border-l border-gray-100 ${
                    isToday ? "bg-[#fffbf0]" : "bg-white"
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      isToday ? "text-purple-600" : "text-gray-400"
                    }`}
                  >
                    {DAY_SHORT[day.getDay()]}
                  </div>
                  <div
                    className={`text-lg font-bold leading-none mt-0.5 ${
                      isToday ? "text-purple-700" : "text-gray-800"
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
                      showHourLine ? "border-t border-gray-200" : "border-t border-gray-50"
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
                    const blockStart = booked && isBookedBlockStart(dateStr, slotMin, srName);

                    let bg: string;
                    if (!working) {
                      bg = "bg-[#f8f8f8]";
                    } else if (booked) {
                      bg = "bg-gray-200";
                    } else {
                      bg = isToday ? "bg-[#fffbf0]" : "bg-white";
                    }

                    return (
                      <div
                        key={di}
                        className={`relative border-l border-gray-100 ${
                          showHourLine ? "border-t border-gray-200" : "border-t border-gray-50"
                        } ${bg}`}
                        style={{
                          height: "32px",
                          userSelect: "none",
                          pointerEvents: "none",
                        }}
                      >
                        {blockStart && (
                          <span className="absolute left-1.5 top-0.5 text-[9px] text-gray-400 font-semibold leading-none select-none">
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

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-4 py-2.5 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-gray-200 bg-white inline-block" />
          <span className="text-[11px] text-gray-500">Slobodan termin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-200 inline-block" />
          <span className="text-[11px] text-gray-500">Zauzeto</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#f8f8f8] border border-gray-200 inline-block" />
          <span className="text-[11px] text-gray-500">Salon ne radi</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#fffbf0] border border-amber-200 inline-block" />
          <span className="text-[11px] text-gray-500">Danas</span>
        </div>
      </div>
    </div>
  );
}
