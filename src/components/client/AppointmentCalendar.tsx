"use client";

import { useState, useMemo, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { DateSelectArg } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import srLocale from "@fullcalendar/core/locales/sr";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import { useAppointments } from "@/hooks/useAppointments";

import { useAuth } from "@/hooks/useAuth";
import ClientCreateModal from "./ClientCreateModal";
import { IAppointment, SalonProfileData } from "@/types";
import { useSalonProfile } from "@/hooks/useSalonProfile";
import { toFullCalendarBusinessHours } from "@/helpers/parseWorkingHours";
import { WorkingHoursWidget } from "../widgets/WorkingHoursWidget";

export default function AppointmentCalendar() {
  const { user } = useAuth();

  const [isClientOpen, setIsClientOpen] = useState(false);
  const [createClientModalData, setCreateClientModalData] = useState({
    date: "",
    time: "",
  });
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

    const deltaX = Math.abs(touchMoveRef.current.x - touchStartRef.current.x);
    const deltaY = Math.abs(touchMoveRef.current.y - touchStartRef.current.y);

    // Ako je pomeraj veći od 10px, smatra se swipe-om
    if (deltaX > 5 || deltaY > 5) {
      setIsSwiping(true);
    }
  };

  const handleTouchEnd = () => {
    // Resetujemo nakon kratkog delay-a
    setTimeout(() => setIsSwiping(false), 300);
  };

  const {
    data: response,
    isLoading: loading,
    isError,
  } = useAppointments({
    page: 1,
    limit: 100,
  });
  const { data: salonProfile } = useSalonProfile();

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

  // Use shared parseWorkingHours helper — supports both legacy string & new slot array format
  const businessHours = toFullCalendarBusinessHours(
    (salonProfile?.workingHours as Record<string, unknown> | null) ?? null,
  );

  const appointments = useMemo(() => {
    return response?.appointments || [];
  }, [response?.appointments]);

  // transform appointments -> events
  const events = useMemo(() => {
    return appointments.map((a: IAppointment) => {
      const duration = a.duration || 60; // Default 60 minuta
      const startDateTime = new Date(`${a.date}T${a.time}`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      return {
        id: a._id,
        title: `${a.serviceName} • ${a.clientName}`,
        start: startDateTime,
        end: endDateTime,
        extendedProps: {
          duration: duration,
        },
      };
    });
  }, [appointments]);

  const handleDateSelect = (info: DateSelectArg) => {
    if (!user)
      return toast.error(
        "Morate biti prijavljeni da biste rezervisali termin.",
      );
    if (isSwiping) {
      return;
    }
    if (info.start < new Date())
      return toast.error("Ne možete zakazati za ovaj termin.");

    const dayNumber = info.start.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0–6
    const hours = info.start.getHours();
    const minutes = info.start.getMinutes();
    const timeValue = hours * 60 + minutes;

    const workingEntry = businessHours.find(
      (b: (typeof businessHours)[number]) => b?.daysOfWeek.includes(dayNumber),
    );

    if (!workingEntry) {
      return toast.error("Salon ne radi ovaj dan.");
    }

    const [startH, startM] = workingEntry.startTime.split(":").map(Number);
    const [endH, endM] = workingEntry.endTime.split(":").map(Number);

    const startValue = startH * 60 + startM;
    const endValue = endH * 60 + endM;

    // Slot je pre ili posle radnog vremena?
    if (timeValue < startValue || timeValue >= endValue) {
      return toast.error("Ne možete zakazati za ovaj termin.");
    }

    const date = info.start.toLocaleDateString("en-CA"); // YYYY-MM-DD
    const time = info.start.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setCreateClientModalData({ date, time });
    setIsClientOpen(true);
  };

  const handleDateClick = (info: DateClickArg) => {
    if (!user)
      return toast.error(
        "Morate biti prijavljeni da biste rezervisali termin.",
      );
    if (info.date < new Date())
      return toast.error("Ne možete zakazati za ovaj termin.");

    const dayNumber = info.date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const hours = info.date.getHours();
    const minutes = info.date.getMinutes();
    const timeValue = hours * 60 + minutes;

    const workingEntry = businessHours.find(
      (b: (typeof businessHours)[number]) => b?.daysOfWeek.includes(dayNumber),
    );

    if (!workingEntry) {
      return toast.error("Salon ne radi ovaj dan.");
    }

    const [startH, startM] = workingEntry.startTime.split(":").map(Number);
    const [endH, endM] = workingEntry.endTime.split(":").map(Number);

    const startValue = startH * 60 + startM;
    const endValue = endH * 60 + endM;

    if (timeValue < startValue || timeValue >= endValue) {
      return toast.error("Ne možete zakazati za ovaj termin.");
    }

    const date = info.date.toLocaleDateString("en-CA");
    const time = info.date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setCreateClientModalData({ date, time });
    setIsClientOpen(true);
  };

  // Funkcija za prevodenje statusa iz baze u čitljiv oblik
  function translateAppointmentStatus(status: string): string {
    const statusMap: Record<string, string> = {
      pending: "Na čekanju",
      appointment_approved: "Odobren",
      appointment_rejected: "Odbijen",
      appointment_rescheduled: "Ponovo zakazan",
      appointment_cancelled: "Otkazan",
      appointment_completed: "Završen",
      no_show: "Nije se pojavio",
    };

    return statusMap[status] || status;
  }

  // Funkcija za ekstrakciju i prevodenje statusa iz clientNote
  function translateClientNote(clientNote?: string): string {
    if (!clientNote) return "";

    // Proveri da li clientNote sadrži status
    const statusMatch = clientNote.match(
      /(pending|appointment_approved|appointment_rejected|appointment_rescheduled|appointment_cancelled|appointment_completed|no_show)/,
    );
    if (statusMatch) {
      const status = statusMatch[0];
      const translatedStatus = translateAppointmentStatus(status);
      return `Status termina: ${translatedStatus}`;
    }

    // Ako nije status, vrati originalnu poruku
    return clientNote;
  }

  return (
    <>
      <Toaster position="top-right" />
      <div
        className="p-4 bg-white rounded-2xl overflow-auto overflow-x-scroll"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {loading ? (
          <p className="text-center text-gray-500">Učitavanje termina...</p>
        ) : isError ? (
          <p className="text-center text-red-500">Greška pri učitavanju.</p>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            selectable
            select={handleDateSelect}
            dateClick={handleDateClick}
            editable={user?.isAdmin ?? false}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            height="auto"
            slotDuration="00:15:00" // Slotovi od 15 minuta za precizniji prikaz
            snapDuration="00:15:00" // Snap na 15 minuta
            slotLabelInterval="01:00:00" // Prikazuj label svaki sat
            slotLabelFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            allDaySlot={false}
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            events={events.map((event) => {
              const appt = appointments.find((a) => a._id === event.id);
              if (!appt) return event;

              const duration = appt.duration || 60;
              const startDateTime = new Date(`${appt.date}T${appt.time}`);
              const endDateTime = new Date(
                startDateTime.getTime() + duration * 60000,
              );

              // Proveri da li je trenutni korisnik vlasnik termina
              const isCurrentUserAppointment = appt.clientEmail === user?.email;

              if (!isCurrentUserAppointment) {
                // Tuđi termini - siva boja
                return {
                  id: appt._id,
                  title: `${appt.serviceName} - ${appt.clientName}`,
                  start: startDateTime,
                  end: endDateTime,
                  backgroundColor: "#f3f4f6", // bg-gray-100
                  textColor: "#6b7280", // text-gray-500
                  borderColor: "#d1d5db", // border-gray-300
                };
              }

              // Funkcija za generisanje boje na osnovu stringa
              const stringToColor = (str: string) => {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                  hash = str.charCodeAt(i) + ((hash << 5) - hash);
                }

                // Predefinisane boje za određene usluge (opciono)
                const predefinedColors: Record<string, string> = {
                  Makeup: "#8b5cf6",
                  Manikir: "#ec4899",
                  Pedikir: "#6366f1",
                  // Dodajte ostale ako želite
                };

                // Ako je usluga u predefinisanim, vrati tu boju
                if (predefinedColors[appt.serviceName]) {
                  return predefinedColors[appt.serviceName];
                }

                // Inače generiši boju na osnovu hash-a
                const hue = hash % 360;
                return `hsl(${hue}, 70%, 60%)`;
              };

              const backgroundColor = stringToColor(appt.serviceName);
              const textColor = "#ffffff";

              return {
                id: appt._id,
                title: `${appt.serviceName} - ${
                  appt.clientName
                } (${duration}min) ${translateClientNote(appt.status)}`,
                start: startDateTime,
                end: endDateTime,
                backgroundColor,
                textColor,
                borderColor: backgroundColor,
                extendedProps: {
                  appointmentId: appt._id,
                  clientName: appt.clientName,
                  serviceName: appt.serviceName,
                  duration: appt.duration,
                  status: appt.status,
                },
              };
            })}
            businessHours={businessHours}
            locale={srLocale}
            firstDay={1}
            dayHeaderContent={(args) => {
              const days = [
                "Nedelja",
                "Ponedeljak",
                "Utorak",
                "Sreda",
                "Četvrtak",
                "Petak",
                "Subota",
              ];
              const date = new Date(args.date);
              const dayName = days[date.getDay()];
              const dayNumber = date.getDate();
              const month = date.getMonth() + 1;

              return {
                html: `<div>${dayName}<br/>${dayNumber}.${month}.</div>`,
              };
            }}
          />
        )}
      </div>
      {/* Working hours */}
      <WorkingHoursWidget profile={safeProfile} />
      {/* ── Legenda ────────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap gap-4 px-1 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded border border-gray-200 bg-white shadow-sm flex-shrink-0" />
          <span>Radno vreme</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded border border-gray-200 bg-[#fffadf] flex-shrink-0" />
          <span>Današnji dan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded border border-gray-200 bg-[#f3f3f3] flex-shrink-0" />
          <span>Salon ne radi</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-purple-500 flex-shrink-0" />
          <span>Zakazan termin</span>
        </div>
      </div>

      <ClientCreateModal
        key={`create-${createClientModalData.date}-${createClientModalData.time}`}
        isOpen={isClientOpen}
        onClose={() => setIsClientOpen(false)}
        defaultDate={createClientModalData.date}
        defaultTime={createClientModalData.time}
        token={user?.token}
      />
    </>
  );
}
