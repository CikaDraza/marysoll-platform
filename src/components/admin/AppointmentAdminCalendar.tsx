/**
 * AppointmentAdminCalendar — Custom calendar za admin panel.
 *
 * Bez FullCalendar. Baziran na CalendarBlockPreview logici.
 * Prikazuje termine po danu ili sedmici, omogućava kreiranje i editovanje.
 * Iznad: radno vreme salona + legenda statusa.
 */
"use client";

import { useState, useMemo } from "react";
import {
  format,
  addDays,
  isSameDay,
  getDay,
  startOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  endOfWeek,
} from "date-fns";
import { sr } from "date-fns/locale";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useAppointments } from "@/hooks/useAppointments";
import { useAuth } from "@/hooks/useAuth";
import { useSalonProfileAdmin } from "@/hooks/useSalonProfileAdmin";
import AdminEditModal from "./AdminEditModal";
import AdminCreateModal from "./AdminCreateModal";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import srLocale from "@fullcalendar/core/locales/sr";
import { toFullCalendarBusinessHours } from "@/helpers/parseWorkingHours";
import type {
  IAppointment,
  WorkingHoursMap,
  DayOfWeek,
  ITimeSlot,
} from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES_SR: DayOfWeek[] = [
  "Nedelja",
  "Ponedeljak",
  "Utorak",
  "Sreda",
  "Četvrtak",
  "Petak",
  "Subota",
];

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

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 border-amber-300 text-amber-800",
  appointment_approved: "bg-emerald-100 border-emerald-300 text-emerald-800",
  appointment_rejected: "bg-red-100 border-red-200 text-red-700",
  appointment_rescheduled: "bg-blue-100 border-blue-300 text-blue-800",
  appointment_cancelled: "bg-zinc-100 border-zinc-200 text-zinc-500",
  completed: "bg-teal-100 border-teal-300 text-teal-800",
  no_show: "bg-purple-100 border-purple-300 text-purple-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Čeka",
  appointment_approved: "Odobreno",
  appointment_rejected: "Odbijeno",
  appointment_rescheduled: "Pomerano",
  appointment_cancelled: "Otkazano",
  completed: "Završeno",
  no_show: "Nije došao",
};

// Hex colors for FullCalendar events (Tailwind classes don't work in FC)
const STATUS_HEX: Record<string, string> = {
  pending: "#fbbf24", // amber-400
  appointment_approved: "#10b981", // emerald-500
  appointment_rejected: "#ef4444", // red-500
  appointment_rescheduled: "#3b82f6", // blue-500
  appointment_cancelled: "#9ca3af", // gray-400
  completed: "#14b8a6", // teal-500
  no_show: "#8b5cf6", // purple-500
};

// ─── DayView ──────────────────────────────────────────────────────────────────

function DayView({
  selectedDate,
  appointments,
  workingHours,
  onSlotClick,
  onAppointmentClick,
}: {
  selectedDate: Date;
  appointments: IAppointment[];
  workingHours: WorkingHoursMap | undefined;
  onSlotClick: (date: string, time: string) => void;
  onAppointmentClick: (appt: IAppointment) => void;
}) {
  const { isWorking, start, end } = getWorkingRange(workingHours, selectedDate);
  const slots = useMemo(
    () => (isWorking ? generateSlots(start, end) : []),
    [isWorking, start, end],
  );
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const dayAppts = appointments.filter((a) => a.date === dateStr);

  if (!isWorking) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-zinc-500 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-200 ">
        Salon ne radi ovim danom
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-sm:p-2">
      {slots.map((slot) => {
        const appt = dayAppts.find((a) => a.time === slot);
        if (appt) {
          const color =
            STATUS_COLORS[appt.status] ?? "border-zinc-200 text-zinc-700";
          return (
            <button
              key={slot}
              onClick={() => onAppointmentClick(appt)}
              className={`flex flex-col items-start gap-0.5 px-3 py-3 rounded-xl border-2 text-left transition hover:opacity-80 ${color}`}
            >
              <span className="text-xs font-bold">{slot}</span>
              <span className="text-xs font-semibold leading-tight line-clamp-1">
                {appt.clientName}
              </span>
              <span className="text-[10px] leading-tight line-clamp-1 opacity-80">
                {appt.serviceName}
              </span>
              <span className="text-[9px] uppercase tracking-wide font-bold opacity-70 mt-0.5">
                {STATUS_LABELS[appt.status] ?? appt.status}
              </span>
            </button>
          );
        }
        return (
          <button
            key={slot}
            onClick={() => onSlotClick(dateStr, slot)}
            className="flex flex-col items-start gap-0.5 px-3 py-3 rounded-xl border border-zinc-100 dark:border-zinc-700 text-left hover:border-violet-300 hover:bg-violet-50 transition group"
          >
            <span className="text-xs font-bold text-zinc-400 group-hover:text-violet-600">
              {slot}
            </span>
            <span className="text-[10px] text-zinc-300 group-hover:text-violet-400">
              + Dodaj termin
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
  selectedDate,
  onDayClick,
  onAppointmentClick,
}: {
  weekStart: Date;
  appointments: IAppointment[];
  workingHours: WorkingHoursMap | undefined;
  selectedDate: Date;
  onDayClick: (day: Date) => void;
  onAppointmentClick: (appt: IAppointment) => void;
}) {
  const days = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
  });

  return (
    <div className="grid grid-cols-7 gap-1.5 max-sm:p-2">
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayAppts = appointments.filter((a) => a.date === dateStr);
        const { isWorking } = getWorkingRange(workingHours, day);
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());

        return (
          <button
            key={dateStr}
            onClick={() => onDayClick(day)}
            className={`flex flex-col items-stretch gap-1 p-2 rounded-xl border transition min-h-[100px] text-left ${
              isSelected
                ? "border-violet-400 bg-violet-900 dark:bg-violet-950"
                : isToday
                  ? "border-amber-200"
                  : !isWorking
                    ? "border-red-500 dark:border-red-700 bg-red-500/10 text-white opacity-90"
                    : "border-zinc-100 dark:border-zinc-700 shadow hover:border-violet-200"
            }`}
          >
            <div className="text-center mb-1">
              <span className="text-[9px] font-bold text-zinc-400 uppercase">
                {format(day, "EEE", { locale: sr })}
              </span>
              <p
                className={`text-sm font-bold ${isToday ? "text-amber-600" : isSelected ? "text-violet-500" : "text-zinc-500"}`}
              >
                {format(day, "d")}
              </p>
            </div>

            {!isWorking && (
              <span className="text-[9px] isSelected text-red-400 text-center">
                Neradan
              </span>
            )}

            {dayAppts.slice(0, 3).map((a) => (
              <div
                key={a._id}
                onClick={(e) => {
                  e.stopPropagation();
                  onAppointmentClick(a);
                }}
                className={`px-1.5 py-1 rounded-lg text-[9px] font-semibold border leading-tight truncate ${STATUS_COLORS[a.status] ?? "bg-zinc-100 border-zinc-200 text-zinc-600"}`}
              >
                <span className="font-bold">{a.time}</span> {a.clientName}
              </div>
            ))}

            {dayAppts.length > 3 && (
              <span className="text-[10px] text-zinc-400 text-center">
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

export default function AppointmentAdminCalendar() {
  const { token } = useAuth();
  const { form: salonForm } = useSalonProfileAdmin();
  const workingHours = salonForm.workingHours as WorkingHoursMap | undefined;
  const businessHours = toFullCalendarBusinessHours(
    (workingHours ?? {}) as Record<string, unknown>,
  );

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<IAppointment | null>(null);
  const [createDefaults, setCreateDefaults] = useState({ date: "", time: "" });

  const { data: response, isLoading } = useAppointments({
    page: 1,
    limit: 200,
  });
  const appointments = useMemo(
    () => response?.appointments ?? [],
    [response?.appointments],
  );

  function handleSlotClick(date: string, time: string) {
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

  function goToToday() {
    const today = new Date();
    setSelectedDate(today);
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
  }

  const wh = salonForm.workingHours as WorkingHoursMap;
  const card =
    "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

  return (
    <div className="space-y-5">
      {/* ── Info row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radno vreme */}
        <div className={`${card}`}>
          <p className="text-[11px] font-bold text-zinc-400 dark:text-gray-300 uppercase tracking-widest mb-3">
            Radno vreme salona
          </p>
          <div className="space-y-1.5">
            {Object.entries(wh ?? {}).map(([day, slots]) => {
              const s = slots as ITimeSlot[];
              return (
                <div key={day} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 dark:text-gray-300 font-medium w-28">
                    {day}
                  </span>
                  {s.length > 0 ? (
                    <span className="text-xs font-semibold text-zinc-800 dark:text-gray-300">
                      {s.map((sl) => `${sl.from}–${sl.to}`).join(", ")}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-300">Neradan</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legenda */}
        <div className={`${card}`}>
          <p className="text-[11px] font-bold text-zinc-400 dark:text-gray-300 uppercase tracking-widest mb-3">
            Legenda
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <div key={status} className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded border flex-shrink-0 ${STATUS_COLORS[status] ?? "bg-zinc-100 border-zinc-200"}`}
                />
                <span className="text-xs text-zinc-600 dark:text-gray-300">
                  {label}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded border border-zinc-100 bg-white flex-shrink-0" />
              <span className="text-xs text-zinc-400">Slobodan slot</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded border border-zinc-100 bg-zinc-50 flex-shrink-0 opacity-50" />
              <span className="text-xs text-zinc-300">Neradan dan</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Calendar ────────────────────────────────────────────────────── */}
      <div className={`${card} max-sm:p-0`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 px-5 py-3 max-sm:px-3 max-sm:py-2.5 border-b border-zinc-100 dark:border-zinc-700">
          {/* View toggle — flex-1 */}
          <div className="w-full sm:w-auto sm:flex-1 flex items-center gap-1 bg-zinc-100 dark:bg-gray-800 rounded-xl p-1">
            {[
              { v: "week" as ViewMode, label: "Sedmica" },
              { v: "day" as ViewMode, label: "Dan" },
              { v: "fullcalendar" as ViewMode, label: "Full kalendar" },
            ].map(({ v, label }) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  viewMode === v
                    ? "bg-white dark:bg-gray-700 text-violet-700 dark:text-violet-400 shadow-sm"
                    : "text-zinc-400 dark:text-gray-400 hover:text-zinc-700 dark:hover:text-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Navigation — flex-none (only as wide as needed) */}
          {viewMode !== "fullcalendar" && (
            <div className="w-full sm:w-auto sm:flex-none flex items-center justify-center gap-2">
              <button
                onClick={() =>
                  viewMode === "week"
                    ? setWeekStart((w) => subWeeks(w, 1))
                    : setSelectedDate((d) => addDays(d, -1))
                }
                className={`p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-gray-800 transition text-zinc-400 hover:text-zinc-700 `}
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-zinc-800 dark:text-gray-300 min-w-[160px] sm:min-w-[180px] text-center">
                {viewMode === "week"
                  ? `${format(weekStart, "d MMM", { locale: sr })} – ${format(endOfWeek(weekStart, { weekStartsOn: 1 }), "d MMM yyyy", { locale: sr })}`
                  : format(selectedDate, "EEEE, d MMMM yyyy", { locale: sr })}
              </span>
              <button
                onClick={() =>
                  viewMode === "week"
                    ? setWeekStart((w) => addWeeks(w, 1))
                    : setSelectedDate((d) => addDays(d, 1))
                }
                className="p-1.5 rounded-lg hover:bg-zinc-100 transition text-zinc-400 hover:dark:text-gray-700"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
              {/* Danas — desktop stays here (next to arrows) */}
              <button
                onClick={goToToday}
                className="hidden sm:inline-flex ml-1 px-3 py-1.5 text-xs font-semibold bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition"
              >
                Danas
              </button>
            </div>
          )}

          {/* Right — flex-1: Danas (mobile only) + Novi termin, space-between */}
          <div
            className={`w-full sm:w-auto sm:flex-1 flex items-center gap-2 justify-end ${
              viewMode !== "fullcalendar" ? "max-sm:justify-between" : ""
            }`}
          >
            {viewMode !== "fullcalendar" && (
              <button
                onClick={goToToday}
                className="sm:hidden inline-flex px-3 py-1.5 text-xs font-semibold bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition"
              >
                Danas
              </button>
            )}
            <button
              onClick={() => {
                setCreateDefaults({
                  date: format(selectedDate, "yyyy-MM-dd"),
                  time: "",
                });
                setCreateOpen(true);
              }}
              className="px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 transition whitespace-nowrap"
            >
              + Novi termin
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 max-sm:p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-zinc-400 dark:text-gray-300 text-sm gap-2">
              <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
              Učitavanje termina...
            </div>
          ) : viewMode === "week" ? (
            <WeekView
              weekStart={weekStart}
              appointments={appointments}
              workingHours={workingHours}
              selectedDate={selectedDate}
              onDayClick={handleDayClick}
              onAppointmentClick={handleAppointmentClick}
            />
          ) : viewMode === "day" ? (
            <>
              {/* Day strip */}
              <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none">
                {Array.from({ length: 14 }).map((_, i) => {
                  const day = addDays(new Date(), i - 3);
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  const { isWorking } = getWorkingRange(workingHours, day);
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(day)}
                      className={`flex flex-col items-center flex-shrink-0 w-12 h-14 rounded-xl border transition ${
                        isSelected
                          ? "bg-violet-600 border-violet-600 text-white"
                          : isToday
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : !isWorking
                              ? "border-red-500 dark:border-red-700 bg-red-500/10 text-red-400 opacity-90"
                              : "border-zinc-100 dark:border-gray-700 bg-white dark:bg-gray-900 text-zinc-600 dark:text-gray-400 hover:border-violet-200"
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
                onSlotClick={handleSlotClick}
                onAppointmentClick={handleAppointmentClick}
              />
            </>
          ) : (
            /* ── FullCalendar view ──────────────────────────────────────── */
            /* Mobile: `.admin-fc` scrolls horizontally; CSS forces a min width so
               each day column is ≥150px and the header + slots scroll Mon→Sun
               together (see globals.css). `dayMinWidth` is intentionally NOT used —
               it requires the premium ScrollGrid plugin ("No ScrollGrid implementation"). */
            <div className="admin-fc">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                /* `dateClick` (single tap/click) instead of `select` (drag): on
                   touch devices `select` needs a long-press, so a normal tap never
                   opened the create modal on mobile. `dateClick` fires on a plain
                   tap on every device, and still lets a drag scroll horizontally. */
                dateClick={(info) => {
                  const date = info.date.toLocaleDateString("en-CA");
                  const time = info.date.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  handleSlotClick(date, time);
                }}
                eventClick={(info) => {
                  const appt = appointments.find(
                    (a) => a._id === info.event.id,
                  );
                  if (appt) handleAppointmentClick(appt);
                }}
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
                events={appointments.map((a) => {
                  const duration = a.duration || 60;
                  const start = new Date(`${a.date}T${a.time}`);
                  const end = new Date(start.getTime() + duration * 60000);
                  const color = STATUS_HEX[a.status] ?? STATUS_HEX.pending;
                  const label = STATUS_LABELS[a.status] ?? a.status;
                  return {
                    id: a._id,
                    title: `${a.serviceName} — ${a.clientName} (${label})`,
                    start,
                    end,
                    backgroundColor: color,
                    borderColor: color,
                    textColor: "#ffffff",
                  };
                })}
                businessHours={businessHours}
                locale={srLocale}
                firstDay={1}
                dayHeaderContent={(args) => {
                  const d = new Date(args.date);
                  const names = [
                    "Ned",
                    "Pon",
                    "Uto",
                    "Sre",
                    "Čet",
                    "Pet",
                    "Sub",
                  ];
                  return {
                    html: `<div class="text-center"><span class="text-xs text-gray-400 dark:text-gray-500 uppercase">${names[d.getDay()]}</span><br/><span class="font-bold text-gray-800 dark:text-gray-200">${d.getDate()}.${d.getMonth() + 1}.</span></div>`,
                  };
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AdminCreateModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultDate={createDefaults.date}
        defaultTime={createDefaults.time}
        token={token ?? undefined}
      />
      <AdminEditModal
        key={selectedAppt?._id}
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedAppt(null);
        }}
        appointment={selectedAppt}
        token={token ?? undefined}
      />
    </div>
  );
}
