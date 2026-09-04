"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { ClockIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { BookingModal } from "@/components/shared/BookingModal";
import { useServices } from "@/hooks/useServices";
import { useCancelAppointment } from "./useCancelAppointment";
import {
  clientAppointmentPhase,
  isClientActionableStatus,
} from "@/lib/appointments/cancellation";
import { statusMeta } from "@/lib/appointmentColors";
import { useTenant } from "@/contexts/TenantContext";
import type { WorkingHoursInput } from "@/helpers/parseWorkingHours";
import type { IAppointment, ManualSlotsMap } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appointment: IAppointment | null;
  token?: string;
  availabilityMode?: string;
  workingHours?: WorkingHoursInput;
  manualSlots?: ManualSlotsMap;
  bookedAppointments?: {
    _id?: string;
    date: string;
    time: string;
    duration?: number;
  }[];
  onChanged?: () => void;
}

const labelClass =
  "block text-[11px] font-bold text-gray-400 dark:text-gray-300 uppercase tracking-widest mb-1.5";

/**
 * Domen shell za rok izmene i otkazivanje. Kada je izmena dozvoljena, ceo
 * presentation/state/resolver sloj je isti BookingWidget koji kreira termin.
 */
export default function ClientEditModal({
  isOpen,
  onClose,
  appointment,
  token,
  availabilityMode,
  workingHours,
  manualSlots,
  bookedAppointments,
  onChanged,
}: Props) {
  const { data: services = [] } = useServices();
  const { clientGender, tenantSlug } = useTenant();
  const { requestCancel, dialog: cancelDialog } = useCancelAppointment({
    token,
    onCancelled: () => {
      onChanged?.();
      onClose();
    },
  });

  if (!appointment) return null;

  const phase = isClientActionableStatus(appointment.status)
    ? clientAppointmentPhase(appointment)
    : "started";
  const canEdit = phase === "open";
  const canCancel = phase === "open" || phase === "late";

  if (canEdit) {
    return (
      <>
        <BookingModal
          isOpen={isOpen}
          onClose={onClose}
          mode="edit"
          appointment={appointment}
          defaultDate={appointment.date}
          defaultTime={appointment.time}
          services={services}
          isLoggedIn
          userName={appointment.clientName}
          userEmail={appointment.clientEmail}
          token={token}
          tenantSlug={tenantSlug}
          availabilityMode={availabilityMode}
          workingHours={workingHours}
          manualSlots={manualSlots}
          bookedAppointments={bookedAppointments}
          onCancelAppointment={() => requestCancel(appointment)}
          onBooked={onChanged}
        />
        {cancelDialog}
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/80" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="max-w-xl w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Moj termin
                </h3>
                <span
                  className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${statusMeta(appointment.status).chip}`}
                >
                  {statusMeta(appointment.status, clientGender).label}
                </span>
              </div>
              <button onClick={onClose} aria-label="Zatvori">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              <ClockIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {phase === "late"
                  ? "Rok za izmenu termina je prošao. Termin i dalje možete otkazati, ali će biti evidentirano kao kasno otkazivanje."
                  : phase === "started"
                    ? "Termin je već započeo. Za izmenu statusa kontaktirajte salon."
                    : "Nije moguće izmeniti termin. Kontaktirajte salon."}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <div className={labelClass}>Datum</div>
                <div className="font-semibold">{appointment.date}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <div className={labelClass}>Vreme</div>
                <div className="font-semibold">{appointment.time}</div>
              </div>
              <div className="col-span-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <div className={labelClass}>Usluga</div>
                <div className="font-semibold">{appointment.serviceName}</div>
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-5">
              {canCancel ? (
                <button
                  type="button"
                  onClick={() => requestCancel(appointment)}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition"
                >
                  <TrashIcon className="w-4 h-4" /> Otkaži termin
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm"
              >
                Zatvori
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
      {cancelDialog}
    </>
  );
}
