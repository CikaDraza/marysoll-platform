"use client";
/**
 * BookingProvider — JEDAN izvor istine za booking modal.
 * Sav state (izbor usluge/termina, gost forma) i sva tri toka potvrde
 * (ulogovan / gost-rezervacija→prijava / direktan gost) žive ovde;
 * podkomponente čitaju kroz useBookingContext() — bez prop drilling-a.
 * Server pozivi idu kroz useAppointmentMutations i public API rutu.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import {
  manualTimesForDate,
  isManualSlotTaken,
  timeToMin,
} from "@/helpers/manualSlots";
import { availableTimesForDate } from "@/lib/booking/availabilityAdapter";
import {
  estimateServicePrice,
  type PriceLine,
} from "@/helpers/servicePrice";
import {
  formatPriceToString,
  PRICE_ON_REQUEST_LABEL,
} from "@/helpers/formatPrice";
import type { IService, IAppointment } from "@/types";
import type {
  BookingAuthDestination,
  BookingModalProps,
  GuestData,
  PendingAppointment,
} from "./types";

export interface BookingContextValue {
  // ── props koje podkomponente čitaju ──
  services: IService[];
  isLoggedIn: boolean;
  userName?: string;
  userEmail?: string;
  isPendingMode: boolean;
  /** Validan format referral koda iz share URL-a/pending booking-a. */
  referralVoucherCode: string;
  // ── stanje izbora ──
  selectedDate: string;
  setSelectedDate: Dispatch<SetStateAction<string>>;
  selectedTime: string;
  setSelectedTime: Dispatch<SetStateAction<string>>;
  selectedServiceId: string;
  setSelectedServiceId: Dispatch<SetStateAction<string>>;
  selectedVariant: string;
  setSelectedVariant: Dispatch<SetStateAction<string>>;
  selectedExtras: string[];
  setSelectedExtras: Dispatch<SetStateAction<string[]>>;
  note: string;
  setNote: Dispatch<SetStateAction<string>>;
  // ── gost tok ──
  showGuestForm: boolean;
  setShowGuestForm: Dispatch<SetStateAction<boolean>>;
  guestData: GuestData;
  setGuestData: Dispatch<SetStateAction<GuestData>>;
  guestLoading: boolean;
  /** Signal ako klijent već ima nalog (prevencija duplikata, Phase 4a). */
  existingAccount: { exists: boolean; isRegistered: boolean } | null;
  /** Proveri postoji li nalog (zvati na blur telefona/emaila u guest formi). */
  checkExistingClient: () => void;
  /** true dok traje slanje termina za ulogovanog korisnika. */
  isSubmitting: boolean;
  // ── izvedeno ──
  selectedService: IService | undefined;
  isManualMode: boolean;
  availableManualTimes: ReturnType<typeof manualTimesForDate>;
  manualSlotInvalid: boolean;
  /** Klasičan režim: ponuda vremena iz radnog vremena (bez zauzetih/prošlih);
   *  null kada pozivalac nije prosledio workingHours (fallback slobodan unos). */
  availableClassicTimes: string[] | null;
  totalPrice: number;
  totalDuration: number;
  /** Razložena procena — osnovna cena, doplata varijante, dodaci. */
  priceLines: PriceLine[];
  /** Prikaz ukupne cene: "1.500,00 RSD", "od 1.500,00 RSD" (deo je na upit),
   *  "Cena na upit" (sve je na upit) ili "" (ništa još nije izabrano). */
  totalPriceLabel: string;
  // ── akcije ──
  handleClose: () => void;
  handleSubmitLoggedIn: (e: React.FormEvent) => Promise<void>;
  handleGuestReserve: (e: React.FormEvent) => void;
  handleGuestSubmit: (e: React.FormEvent) => Promise<void>;
  doGuestReserve: (destination?: BookingAuthDestination) => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function useBookingContext(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error(
      "useBookingContext mora da se koristi unutar <BookingProvider>",
    );
  }
  return ctx;
}

export function BookingProvider({
  children,
  onClose,
  defaultDate,
  defaultTime,
  services,
  isLoggedIn,
  userName,
  userEmail,
  token,
  tenantSlug,
  onConfirmedByGuest,
  onBooked,
  pendingDefaults,
  availabilityMode,
  workingHours,
  manualSlots,
  bookedAppointments,
}: BookingModalProps & { children: ReactNode }) {
  const { user } = useAuth();
  const { createAppointment } = useAppointmentMutations(token);

  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [selectedTime, setSelectedTime] = useState(defaultTime);
  const [selectedServiceId, setSelectedServiceId] = useState(
    pendingDefaults?.serviceId || services[0]?._id || "",
  );
  const [selectedVariant, setSelectedVariant] = useState(
    pendingDefaults?.variantName || "",
  );
  const [selectedExtras, setSelectedExtras] = useState<string[]>(
    pendingDefaults?.extras || [],
  );
  const [note, setNote] = useState(pendingDefaults?.note || "");
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestData, setGuestData] = useState({
    name: "",
    phone: "",
    email: "",
    instagram: "",
    tiktok: "",
  });
  const [guestLoading, setGuestLoading] = useState(false);
  const [referralVoucherCode, setReferralVoucherCode] = useState(
    pendingDefaults?.voucherCode?.trim().toUpperCase() ?? "",
  );

  // ── Prevencija duplikata (Phase 4a): signal ako klijent već ima nalog ──
  const [existingAccount, setExistingAccount] = useState<{
    exists: boolean;
    isRegistered: boolean;
  } | null>(null);

  const checkExistingClient = useCallback(async () => {
    const email = guestData.email.trim();
    const phone = guestData.phone.trim();
    if (!email && !phone) {
      setExistingAccount(null);
      return;
    }
    try {
      const qs = new URLSearchParams();
      if (email) qs.set("email", email);
      if (phone) qs.set("phone", phone);
      const res = await fetch(
        `/api/public/${tenantSlug}/appointments/check-client?${qs.toString()}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setExistingAccount({
        exists: Boolean(data.exists),
        isRegistered: Boolean(data.isRegistered),
      });
    } catch {
      /* check nikad ne blokira booking */
    }
  }, [guestData.email, guestData.phone, tenantSlug]);

  useEffect(() => {
    async function init() {
      setSelectedDate(defaultDate);
      setSelectedTime(defaultTime);
      const queryVoucher =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("voucher")
          : null;
      const voucherCandidate = (pendingDefaults?.voucherCode ?? queryVoucher ?? "")
        .trim()
        .toUpperCase();
      setReferralVoucherCode(voucherCandidate);
      if (voucherCandidate && tenantSlug) {
        try {
          const res = await fetch(
            `/api/public/${tenantSlug}/loyalty/referral?code=${encodeURIComponent(voucherCandidate)}`,
          );
          const preview = res.ok ? await res.json() : { valid: false };
          if (!preview.valid) setReferralVoucherCode("");
        } catch {
          // Fail closed za guest booking: server booking svakako ponovo validira.
        }
      }
      if (pendingDefaults) {
        setSelectedServiceId(pendingDefaults.serviceId || services[0]?._id || "");
        setSelectedVariant(pendingDefaults.variantName || "");
        setSelectedExtras(pendingDefaults.extras || []);
        setNote(pendingDefaults.note || "");
      }
    }
    init();
  }, [defaultDate, defaultTime, pendingDefaults, services, tenantSlug]);

  const selectedService = services.find((s) => s._id === selectedServiceId);

  // manualSlots režim: nudi se SAMO slobodan budući termin koji je vlasnik
  // definisao — datum/vreme van te liste ne sme proći.
  const isManualMode = availabilityMode === "manualSlots";
  const availableManualTimes = useMemo(() => {
    if (!isManualMode || !selectedDate) return [];
    const now = new Date();
    return manualTimesForDate(manualSlots, selectedDate).filter(
      (s) =>
        new Date(`${selectedDate}T${s.time}`) >= now &&
        !isManualSlotTaken(
          bookedAppointments ?? [],
          selectedDate,
          timeToMin(s.time),
          s.duration,
        ),
    );
  }, [isManualMode, manualSlots, bookedAppointments, selectedDate]);

  const manualSlotInvalid =
    isManualMode && !availableManualTimes.some((s) => s.time === selectedTime);

  function validateManualSlot(): boolean {
    if (manualSlotInvalid) {
      toast.error(
        "Izabrani termin nije dostupan. Izaberite jedan od ponuđenih termina.",
      );
      return false;
    }
    return true;
  }

  // Procena cene i trajanja živi u `estimateServicePrice` — istom helperu koji
  // koriste admin lista i javni cenovnik, da tri površine ne bi imale tri
  // tumačenja iste usluge.
  const estimate = useMemo(
    () =>
      selectedService
        ? estimateServicePrice({
            service: selectedService,
            variantName: selectedVariant,
            extraNames: selectedExtras,
          })
        : null,
    [selectedService, selectedVariant, selectedExtras],
  );

  const totalPrice = estimate?.total ?? 0;
  const totalDuration = estimate?.durationMinutes ?? 0;
  const priceLines = estimate?.lines ?? [];

  const totalPriceLabel = useMemo(() => {
    if (!estimate || estimate.unknown)
      return estimate ? PRICE_ON_REQUEST_LABEL : "";
    const formatted = `${formatPriceToString(estimate.total)} RSD`;
    return estimate.isEstimate ? `od ${formatted}` : formatted;
  }, [estimate]);

  // Ime izbora koje ide u termin. Paket i jedna usluga nemaju izbor — samo
  // varijanta uz ime usluge ("Izlivanje noktiju - Veličina 2").
  const selectionLabel =
    selectedService?.type === "variant" ? selectedVariant : "";

  /** Jedini obavezan izbor u katalogu je varijanta. */
  function validateSelection(service: IService): boolean {
    if (service.type === "variant" && !selectedVariant) {
      toast.error("Molimo izaberite varijantu usluge.");
      return false;
    }
    return true;
  }

  // Klasičan režim: dropdown nudi SAMO dostupna vremena za izabrani datum
  // (radno vreme − zauzeto − prošlost), uračunato trajanje izabrane usluge.
  const availableClassicTimes = useMemo(() => {
    if (isManualMode || workingHours == null) return workingHours == null ? null : [];
    return availableTimesForDate({
      tenantId: "booking-modal",
      localDate: selectedDate,
      durationMinutes: totalDuration || 60,
      profile: { workingHours },
      appointments: bookedAppointments ?? [],
      now: new Date(),
    });
  }, [isManualMode, workingHours, selectedDate, totalDuration, bookedAppointments]);

  function handleClose() {
    setSelectedServiceId(services[0]?._id || "");
    setSelectedVariant("");
    setSelectedExtras([]);
    setNote("");
    setShowGuestForm(false);
    setGuestData({ name: "", phone: "", email: "", instagram: "", tiktok: "" });
    onClose();
  }

  async function handleSubmitLoggedIn(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return toast.error("Morate biti prijavljeni.");
    if (!selectedDate || !selectedTime)
      return toast.error("Molimo izaberite datum i vreme.");
    if (!validateManualSlot()) return;
    if (!selectedService) return toast.error("Izabrana usluga nije pronađena.");
    if (!validateSelection(selectedService)) return;

    const extrasForStorage = selectedExtras.map((extraName) => {
      const extra = selectedService.extras?.find((e) => e.name === extraName);
      return {
        name: extraName,
        price: extra?.price || 0,
        duration: extra?.duration || 0,
        perItem: extra?.perItem || false,
      };
    });

    const payload: IAppointment = {
      clientProfileId: user.tenantUserId ?? undefined,
      clientName: user.name,
      clientEmail: user.email,
      serviceName: `${selectedService.name}${selectionLabel ? ` - ${selectionLabel}` : ""}`,
      services: [
        {
          serviceId: selectedServiceId || "",
          serviceName: selectionLabel || selectedService.name,
          extras: extrasForStorage.length > 0 ? extrasForStorage : undefined,
          quantity: 1,
          price: totalPrice,
          duration: totalDuration,
        },
      ],
      date: selectedDate,
      time: selectedTime,
      duration: totalDuration,
      note: note || undefined,
      status: "pending",
      ...(referralVoucherCode ? { voucherCode: referralVoucherCode } : {}),
      messages: [],
      adminNotified: true,
      clientNotified: false,
      lastUpdatedBy: "client",
    };

    try {
      await createAppointment.mutateAsync(payload);
      onBooked?.();
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Greška pri kreiranju termina.");
    }
  }

  function doGuestReserve(destination: BookingAuthDestination = "login") {
    if (!selectedDate || !selectedTime)
      return toast.error("Molimo izaberite datum i vreme.");
    if (!validateManualSlot()) return;
    if (!selectedService) return toast.error("Izabrana usluga nije pronađena.");
    if (!validateSelection(selectedService)) return;

    onConfirmedByGuest({
      date: selectedDate,
      time: selectedTime,
      serviceId: selectedServiceId,
      variantName: selectedVariant,
      extras: selectedExtras,
      note,
      totalPrice,
      totalDuration,
      ...(referralVoucherCode ? { voucherCode: referralVoucherCode } : {}),
    }, destination);
  }

  function handleGuestReserve(e: React.FormEvent) {
    e.preventDefault();
    doGuestReserve();
  }

  async function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (referralVoucherCode) {
      return toast.error(
        "Gift vaučer zahteva nalog. Prijavite se ili napravite nalog.",
      );
    }
    if (!selectedDate || !selectedTime)
      return toast.error("Molimo izaberite datum i vreme.");
    if (!validateManualSlot()) return;
    if (!selectedService) return toast.error("Izabrana usluga nije pronađena.");
    if (!validateSelection(selectedService)) return;
    if (!guestData.name.trim()) return toast.error("Unesite ime i prezime.");
    if (
      !guestData.phone.trim() &&
      !guestData.email.trim() &&
      !guestData.instagram.trim()
    ) {
      return toast.error("Unesite telefon, email ili Instagram.");
    }
    if (!tenantSlug)
      return toast.error("Greška: nedostaje identifikator salona.");

    const extrasForStorage = selectedExtras.map((extraName) => {
      const extra = selectedService.extras?.find((e) => e.name === extraName);
      return {
        name: extraName,
        price: extra?.price || 0,
        duration: extra?.duration || 0,
        perItem: extra?.perItem || false,
      };
    });

    const normalizedInstagram = guestData.instagram.trim().replace(/^@+/, "");
    const noteParts = [note || ""];
    if (guestData.tiktok.trim())
      noteParts.push(`TikTok: @${guestData.tiktok.trim()}`);
    const noteWithInstagram = noteParts.filter(Boolean).join("\n") || undefined;

    setGuestLoading(true);
    try {
      const res = await fetch(`/api/public/${tenantSlug}/appointments/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: guestData.name.trim(),
          phone: guestData.phone.trim(),
          email: guestData.email.trim() || null,
          instagram: normalizedInstagram || null,
          tiktok: guestData.tiktok.trim() || null,
          preferredContact: guestData.phone.trim()
            ? "phone"
            : normalizedInstagram
              ? "instagram"
              : "email",
          serviceId: selectedServiceId,
          serviceName: `${selectedService.name}${selectionLabel ? ` - ${selectionLabel}` : ""}`,
          services: [
            {
              serviceId: selectedServiceId,
              serviceName: selectionLabel || selectedService.name,
              extras:
                extrasForStorage.length > 0 ? extrasForStorage : undefined,
              quantity: 1,
              price: totalPrice,
              duration: totalDuration,
            },
          ],
          date: selectedDate,
          time: selectedTime,
          duration: totalDuration,
          note: noteWithInstagram,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Greška");
      }

      toast.success("Zakazano — čeka odobrenje.");
      onBooked?.();
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Greška pri zakazivanju.");
    } finally {
      setGuestLoading(false);
    }
  }

  const isPendingMode = !!pendingDefaults;

  const value: BookingContextValue = {
    services,
    isLoggedIn,
    userName,
    userEmail,
    isPendingMode,
    referralVoucherCode,
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    selectedServiceId,
    setSelectedServiceId,
    selectedVariant,
    setSelectedVariant,
    selectedExtras,
    setSelectedExtras,
    note,
    setNote,
    showGuestForm,
    setShowGuestForm,
    guestData,
    setGuestData,
    guestLoading,
    existingAccount,
    checkExistingClient,
    isSubmitting: createAppointment.isPending,
    selectedService,
    isManualMode,
    availableManualTimes,
    manualSlotInvalid,
    availableClassicTimes,
    totalPrice,
    totalDuration,
    priceLines,
    totalPriceLabel,
    handleClose,
    // toast.error vraća string pa originalni handleri nisu striktno Promise<void>;
    // wrap čuva ugovor konteksta bez promene ponašanja.
    handleSubmitLoggedIn: async (e) => {
      await handleSubmitLoggedIn(e);
    },
    handleGuestReserve,
    handleGuestSubmit: async (e) => {
      await handleGuestSubmit(e);
    },
    doGuestReserve,
  };

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}

export type { PendingAppointment };
