/**
 * Tipovi booking modala. PendingAppointment + PENDING_STORAGE_KEY su javni
 * ugovor (koriste ih widgeti i Theme8ModalProvider) — re-exportuju se i sa
 * starog puta "@/components/shared/BookingModal" radi kompatibilnosti.
 */
import type { IAppointment, IService, ManualSlotsMap } from "@/types";
import type { WorkingHoursInput } from "@/helpers/parseWorkingHours";

export type PendingAppointment = {
  tenantSlug: string;
  date: string;
  time: string;
  serviceId: string;
  variantName: string;
  extras: string[];
  /** Količina po dodatku. Stariji zapisi je nemaju → podrazumeva se 1. */
  extraQuantities?: Record<string, number>;
  note: string;
  totalPrice: number;
  totalDuration: number;
  /** Gift/referral kod koji mora da preživi login/register round-trip. */
  voucherCode?: string;
};

export type BookingAuthDestination = "login" | "register";

export const PENDING_STORAGE_KEY = "ms_pending_appointment";

export interface GuestData {
  name: string;
  phone: string;
  email: string;
  instagram: string;
  tiktok: string;
}

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate: string;
  defaultTime: string;
  services: IService[];
  isLoggedIn: boolean;
  userName?: string;
  userEmail?: string;
  token?: string;
  tenantSlug?: string;
  onConfirmedByGuest?: (
    data: Omit<PendingAppointment, "tenantSlug">,
    destination?: BookingAuthDestination,
  ) => void;
  /** Fired after a successful booking (logged-in or direct guest) so the
   *  caller can refresh its calendar and mark the new slot as taken. */
  onBooked?: () => void;
  /** Isti widget u edit režimu šalje client update komandu umesto create. */
  mode?: "create" | "edit";
  appointment?: IAppointment | null;
  /** Opciono domen-specifično otkazivanje; presentation ostaje zajednički. */
  onCancelAppointment?: () => void;
  pendingDefaults?: Omit<PendingAppointment, "tenantSlug"> | null;
  /** "manualSlots" ograničava izbor na termine koje je vlasnik definisao. */
  availabilityMode?: string;
  /** Radno vreme salona — klasičan režim gradi dropdown dostupnih vremena. */
  workingHours?: WorkingHoursInput;
  manualSlots?: ManualSlotsMap;
  /** Zauzeti termini (javni podaci) — filtriraju ponudu u manual režimu. */
  bookedAppointments?: {
    _id?: string;
    date: string;
    time: string;
    duration?: number;
  }[];
}
