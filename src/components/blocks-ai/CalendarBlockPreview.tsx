"use client";
import { useState, useMemo } from "react";
import { format, addDays, isSameDay, getDay } from "date-fns";
import { sr } from "date-fns/locale";
import { useAppointments } from "@/hooks/useAppointments";
import { useAuth } from "@/hooks/context/AuthContext";
import { useSalonProfile } from "@/hooks/useSalonProfile";
import { DayWorkingInfo, TimeSlot, WorkingHoursRaw } from "@/types";

// Helper funkcija – da li je slot unutar barem jednog radnog intervala
function isTimeInAnySlot(time: string, slots: TimeSlot[]): boolean {
  if (!slots?.length) return false;

  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const tMin = toMinutes(time);

  return slots.some((s) => {
    const startMin = toMinutes(s.from);
    const endMin = toMinutes(s.to);
    return tMin >= startMin && tMin < endMin;
  });
}

interface Props {
  onSlotClick: (date: string, time: string) => void;
  // opciono: ako kasnije želiš da filtriraš po trajanju usluge
  serviceDurationMinutes?: number;
}

export function CalendarBlockPreview({ onSlotClick }: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { user } = useAuth();
  const { data: profile } = useSalonProfile();

  // Fetch termina za izabrani dan
  const { data: response, isLoading } = useAppointments({
    date: format(selectedDate, "yyyy-MM-dd"),
    limit: 100,
    clientId: user?.id,
  });

  // Narednih 14 dana
  const days = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i));
  }, []);

  // Standardni 30-min slotovi (možeš kasnije prilagoditi po potrebi)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 0; h < 24; h++) {
      slots.push(`${h.toString().padStart(2, "0")}:00`);
      slots.push(`${h.toString().padStart(2, "0")}:30`);
    }
    return slots;
  }, []);

  // Radno vreme za izabrani dan
  const workingHoursForDay = useMemo<DayWorkingInfo>(() => {
    const dayNames = [
      "Nedelja",
      "Ponedeljak",
      "Utorak",
      "Sreda",
      "Četvrtak",
      "Petak",
      "Subota",
    ] as const;

    const hoursSource = profile?.workingHours as WorkingHoursRaw | undefined;
    if (!hoursSource) {
      return { dayName: "", isWorking: false, slots: [] };
    }

    const dayIndex = getDay(selectedDate);
    const dayName = dayNames[dayIndex];

    const slots = hoursSource[dayName] ?? [];
    const isWorking = Array.isArray(slots) && slots.length > 0;

    return {
      dayName,
      isWorking,
      slots: isWorking ? slots : [],
    };
  }, [selectedDate, profile?.workingHours]);

  // Glavna logika prikaza
  return (
    <div className="flex flex-col gap-5">
      {/* Horizontalni izbor dana */}
      <div className="flex gap-2 overflow-x-auto pb-3 snap-x scrollbar-hide">
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`shrink-0 w-16 h-20 flex flex-col items-center justify-center rounded-2xl border transition-all text-sm ${
                isSelected
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-105"
                  : "bg-white border-gray-200 text-gray-700 hover:border-indigo-300"
              }`}
            >
              <span className="text-[10px] uppercase font-semibold">
                {format(day, "EEE", { locale: sr })}
              </span>
              <span className="text-xl font-bold mt-1">{format(day, "d")}</span>
            </button>
          );
        })}
      </div>

      {/* Grid termina */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-[420px] overflow-y-auto p-1">
        {!workingHoursForDay.isWorking ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-2xl">
            Salon ne radi ovog dana.
          </div>
        ) : isLoading ? (
          <div className="col-span-full py-12 text-center text-gray-400">
            Učitavam termine...
          </div>
        ) : (
          timeSlots.map((slot) => {
            // 1. Van radnog vremena → sakrij
            const isOutsideWorkingHours = !isTimeInAnySlot(
              slot,
              workingHoursForDay.slots,
            );
            if (isOutsideWorkingHours) return null;

            // 2. Pronađi postojeći termin za ovaj slot
            const appointment = response?.appointments?.find(
              (a) => a.time === slot,
            );

            const isTaken = !!appointment;
            const isMyAppointment = appointment?.clientId === user?.id;

            // 3. Ako usluga traje duže → proveri da li bi preklopila sledeći slot (opciono)
            // const wouldOverlap = ... (možeš dodati kasnije)

            return (
              <button
                key={slot}
                disabled={isTaken && !isMyAppointment}
                onClick={() => {
                  if (!isTaken) {
                    onSlotClick(format(selectedDate, "yyyy-MM-dd"), slot);
                  }
                }}
                className={`py-3 px-2 rounded-xl text-sm font-medium border transition-all ${
                  isMyAppointment
                    ? "bg-purple-100 border-purple-300 text-purple-800 ring-1 ring-purple-200"
                    : isTaken
                      ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
                }`}
              >
                {slot}
                {isMyAppointment && (
                  <span className="block text-[9px] mt-0.5 uppercase tracking-wide text-purple-600 font-semibold">
                    Tvoj termin
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap justify-center gap-4 px-2 py-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white border border-gray-300" />
          <span>Slobodno</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span>Zauzeto</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span>Tvoj termin</span>
        </div>
      </div>
    </div>
  );
}
