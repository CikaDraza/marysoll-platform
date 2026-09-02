"use client";
/**
 * BookingModal — tanka kompozicija (Faza 4e refaktor, ranije 843 linije).
 * Sav state/logika: BookingProvider (jedan izvor istine); sekcije u
 * components/shared/booking/ čitaju context — bez prop drilling-a.
 * Spoljni API (props + PendingAppointment + PENDING_STORAGE_KEY) je
 * NEPROMENJEN — pozivaoci (widgeti, AppointmentCalendarPage) ne diraju se.
 */
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import {
  BookingProvider,
  useBookingContext,
} from "@/components/shared/booking/BookingProvider";
import { BookingAuthInfo } from "@/components/shared/booking/BookingAuthInfo";
import { BookingModalBody } from "@/components/shared/booking/BookingModalBody";
import type { BookingModalProps } from "@/components/shared/booking/types";

export type { PendingAppointment } from "@/components/shared/booking/types";
export { PENDING_STORAGE_KEY } from "@/components/shared/booking/types";

function BookingModalShell({
  isOpen,
}: {
  isOpen: boolean;
}) {
  const {
    isLoggedIn,
    isPendingMode,
    showGuestForm,
    handleClose,
    handleSubmitLoggedIn,
    handleGuestSubmit,
    handleGuestReserve,
    isEditMode,
  } = useBookingContext();

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {isEditMode ? "Izmena termina" : "Zakazivanje termina"}
              </h3>
              {isPendingMode && (
                <p className="text-sm text-(--primary-color) font-medium mt-1">
                  Dobrodošli nazad! Vaš termin čeka potvrdu.
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <BookingAuthInfo />

          <form
            onSubmit={
              isLoggedIn
                ? handleSubmitLoggedIn
                : showGuestForm
                  ? handleGuestSubmit
                  : handleGuestReserve
            }
            className="flex-1 flex flex-col gap-4"
          >
            <BookingModalBody />
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export function BookingModal(props: BookingModalProps) {
  return (
    <BookingProvider {...props}>
      <BookingModalShell isOpen={props.isOpen} />
    </BookingProvider>
  );
}
