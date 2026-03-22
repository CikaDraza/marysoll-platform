"use client";

import { useMemo, useRef, useState, useMemo as useMemoHook } from "react";
import toast, { Toaster } from "react-hot-toast";
import FullCalendar from "@fullcalendar/react";
import srLocale from "@fullcalendar/core/locales/sr";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import { useAppointments } from "@/hooks/useAppointments";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { useAuth } from "@/hooks/useAuth";
import AdminEditModal from "./AdminEditModal";
import AdminCreateModal from "./AdminCreateModal";
import { IAppointment } from "@/types";
import MiniLoader from "../ai/MiniLoader";

export default function AppointmentAdminCalendar() {
  const { user, token } = useAuth();
  const {
    data: response,
    isLoading,
    isError,
  } = useAppointments({
    page: 1,
    limit: 100,
  });
  const appointments = useMemoHook(() => {
    return response?.appointments || [];
  }, [response?.appointments]);

  const { updateAppointment } = useAppointmentMutations(token ?? undefined);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Razdvojeni state za Create modal
  const [createModalData, setCreateModalData] = useState({
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

  // State za Edit modal
  const [selectedAppointment, setSelectedAppointment] =
    useState<IAppointment | null>(null);

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
    if (!user) return toast.error("Morate biti prijavljeni.");
    if (isSwiping) {
      return;
    }
    if (info.start < new Date())
      return toast.error("Ne možete zakazati za ovaj termin.");

    const date = info.start.toLocaleDateString("en-CA"); // YYYY-MM-DD
    const time = info.start.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Postavi podatke specifične za Create modal
    setCreateModalData({ date, time });
    setCreateModalOpen(true);
  };

  const handleDateClick = (info: DateClickArg) => {
    if (!user)
      return toast.error(
        "Morate biti prijavljeni da biste rezervisali termin.",
      );
    if (info.date < new Date())
      return toast.error("Ne možete zakazati za ovaj termin.");

    const date = info.date.toLocaleDateString("en-CA");
    const time = info.date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setCreateModalData({ date, time });
    setCreateModalOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const appt = appointments.find(
      (a: IAppointment) => a._id === clickInfo.event.id,
    );
    if (!appt) return;
    setSelectedAppointment(appt);
    setEditModalOpen(true);
  };

  const handleEventDrop = (dropInfo: EventDropArg) => {
    const appointmentId = dropInfo.event.id;
    if (isSwiping) {
      dropInfo.jsEvent.preventDefault();
    }
    const appt = appointments.find(
      (a: IAppointment) => a._id === appointmentId,
    );

    if (!appt) {
      toast.error("Termin nije pronađen.");
      dropInfo.revert();
      return;
    }

    const duration = appt.duration || 60;
    const newStart = dropInfo.event.start!;
    const newEnd = new Date(newStart.getTime() + duration * 60000);

    // Proveri zauzetost novog termina
    const isOverlapping = appointments.some((appointment) => {
      if (appointment._id === appointmentId) return false;

      const appointmentStart = new Date(
        `${appointment.date}T${appointment.time}`,
      );
      const appointmentDuration = appointment.duration || 60;
      const appointmentEnd = new Date(
        appointmentStart.getTime() + appointmentDuration * 60000,
      );

      return newStart < appointmentEnd && newEnd > appointmentStart;
    });

    if (isOverlapping) {
      toast.error("Termin je već zauzet. Vraćam na prethodnu poziciju.");
      dropInfo.revert();
      return;
    }

    // Ažuriraj termin
    updateAppointment.mutate({
      id: appointmentId,
      updatedData: {
        date: newStart.toISOString().split("T")[0],
        time: newStart.toTimeString().split(" ")[0].substring(0, 5),
        lastUpdatedBy: "admin",
      },
    });
  };

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
    // Resetuj create modal data kada se zatvori
    setCreateModalData({ date: "", time: "" });
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedAppointment(null);
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

  // Funkcija za ekstrakciju i prevodenje statusa iz adminNote
  function translateAdminNote(adminNote?: string): string {
    if (!adminNote) return "";

    // Proveri da li adminNote sadrži status
    const statusMatch = adminNote.match(
      /(pending|appointment_approved|appointment_rejected|appointment_rescheduled|appointment_cancelled|appointment_completed|no_show)/,
    );
    if (statusMatch) {
      const status = statusMatch[0];
      const translatedStatus = translateAppointmentStatus(status);
      return `Status termina: ${translatedStatus}`;
    }

    // Ako nije status, vrati originalnu poruku
    return adminNote;
  }

  return (
    <div className="overflow-y-hidden">
      <Toaster position="top-right" />
      <div
        className="p-4 bg-white rounded-2xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isLoading ? (
          <MiniLoader />
        ) : isError ? (
          <p className="text-center text-red-500">Greška pri učitavanju.</p>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            selectable
            select={handleDateSelect}
            editable={user?.isAdmin ?? false}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            eventDrop={handleEventDrop}
            selectLongPressDelay={500}
            eventLongPressDelay={500}
            longPressDelay={500}
            selectMirror={true}
            firstDay={1}
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
            slotMinTime="06:00:00"
            slotMaxTime="24:00:00"
            events={events.map((event) => {
              const appt = appointments.find((a) => a._id === event.id);
              if (!appt) return event;

              const duration = appt.duration || 60;
              const startDateTime = new Date(`${appt.date}T${appt.time}`);
              const endDateTime = new Date(
                startDateTime.getTime() + duration * 60000,
              );

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
                } (${duration}min) ${translateAdminNote(appt.status)}`, // Dodaj duration u title
                start: startDateTime,
                end: endDateTime,
                backgroundColor,
                textColor,
                borderColor: backgroundColor,
                extendedProps: {
                  appointmentId: appt._id,
                  clientName: appt.clientName,
                  serviceName: appt.serviceName,
                  duration: duration,
                  status: appt.status,
                },
              };
            })}
            locale={srLocale}
            dayHeaderContent={(args) => {
              const date = new Date(args.date);
              const dayNumber = date.getDate();
              const month = date.getMonth() + 1;

              // Provera širine ekrana
              const screenWidth = window.innerWidth;

              let dayName;
              if (screenWidth < 480) {
                // Vrlo mali ekrani - samo inicijali
                const daysShort = [
                  "Ned",
                  "Pon",
                  "Uto",
                  "Sre",
                  "Čet",
                  "Pet",
                  "Sub",
                ];
                dayName = daysShort[date.getDay()];
              } else if (screenWidth < 768) {
                // Mobilni ekrani - skraćeni nazivi
                const daysMedium = [
                  "Ned",
                  "Pon",
                  "Uto",
                  "Sre",
                  "Čet",
                  "Pet",
                  "Sub",
                ];
                dayName = daysMedium[date.getDay()];
              } else {
                // Desktop ekrani - puni nazivi
                const daysFull = [
                  "Nedelja",
                  "Ponedeljak",
                  "Utorak",
                  "Sreda",
                  "Četvrtak",
                  "Petak",
                  "Subota",
                ];
                dayName = daysFull[date.getDay()];
              }

              return {
                html: `<div class="day-header"><div class="day-name">${dayName}</div><div class="day-date">${dayNumber}.${month}.</div></div>`,
              };
            }}
          />
        )}
      </div>

      <AdminCreateModal
        key={`create-${createModalData.date}-${createModalData.time}`}
        isOpen={createModalOpen}
        onClose={handleCloseCreateModal}
        defaultDate={createModalData.date}
        defaultTime={createModalData.time}
        token={token ?? undefined}
      />

      <AdminEditModal
        key={`edit-${selectedAppointment?._id || "new"}`}
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        appointment={selectedAppointment}
        token={token ?? undefined}
      />
    </div>
  );
}
