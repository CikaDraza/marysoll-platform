"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import srLocale from "@fullcalendar/core/locales/sr";
import type { IAppointment } from "@/types";
import type { SalonProfileData } from "@/types";
import { toFullCalendarBusinessHours } from "@/helpers/parseWorkingHours";

type Props = {
  initialAppointments: IAppointment[];
  salonProfile: SalonProfileData;
};

const CATEGORY_COLORS = [
  "#8b5cf6", "#ec4899", "#6366f1", "#f43f5e", "#3b82f6",
  "#00ba7c", "#e05e00", "#a855f7", "#ef4444", "#05a390",
];

const DAYS_SHORT = ["Ned", "Pon", "Uto", "Sre", "Čet", "Pet", "Sub"];
const DAYS_FULL = ["Nedelja", "Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota"];

export default function AppointmentCalendarPage({
  initialAppointments,
  salonProfile,
}: Props) {
  // Business hours — uses new multi-slot working hours parser
  const businessHours = useMemo(
    () => toFullCalendarBusinessHours(
      salonProfile?.workingHours as Record<string, unknown> | null
    ),
    [salonProfile?.workingHours]
  );

  // Service color map (index-based, no serviceId lookup needed on public page)
  const calendarEvents = useMemo(() => {
    return initialAppointments.map((appt: IAppointment, idx: number) => {
      const duration = appt.duration || 60;
      const startDateTime = new Date(`${appt.date}T${appt.time}`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

      return {
        id: appt._id,
        title: appt.serviceName || "Zauzeto",
        start: startDateTime,
        end: endDateTime,
        backgroundColor: color,
        borderColor: color,
        textColor: "#ffffff",
        extendedProps: {
          duration,
          status: appt.status,
        },
      };
    });
  }, [initialAppointments]);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-2 lg:p-8 overflow-y-auto">
      <div className="relative overflow-auto">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          selectable={false}
          dayMaxEvents={false}
          moreLinkClick="week"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          views={{
            timeGridDay: { titleFormat: { year: "numeric", month: "long", day: "numeric" } },
            timeGridWeek: { titleFormat: { year: "numeric", month: "long", day: "numeric" } },
          }}
          height="auto"
          slotDuration="00:15:00"
          snapDuration="00:15:00"
          slotLabelInterval="01:00:00"
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          events={calendarEvents}
          businessHours={businessHours}
          locale={srLocale}
          dayHeaderContent={(args) => {
            const date = new Date(args.date);
            const dayNumber = date.getDate();
            const month = date.getMonth() + 1;
            const dayIdx = date.getDay();

            // SSR-safe: no window access during render
            const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
            const dayName = screenWidth < 768 ? DAYS_SHORT[dayIdx] : DAYS_FULL[dayIdx];

            return {
              html: `<div class="day-header"><div class="day-name">${dayName}</div><div class="day-date">${dayNumber}.${month}.</div></div>`,
            };
          }}
        />
      </div>
    </div>
  );
}
