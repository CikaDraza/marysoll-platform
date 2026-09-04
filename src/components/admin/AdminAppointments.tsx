"use client";

import { useSearchParams } from "next/navigation";
import {
  AppointmentRequestModal,
  hasRequest,
  hasRequestImage,
} from "./AppointmentRequestModal";
import { AppointmentPriceModal } from "./AppointmentPriceModal";
import { AppointmentCheckoutModal } from "./AppointmentCheckoutModal";
import { LoyaltyBenefitPicker } from "@/components/loyalty/LoyaltyBenefitPicker";
import { api } from "@/lib/api";
import { formatISODate } from "@/helpers/formatISODate";
import { statusMeta } from "@/lib/appointmentColors";
import { displayClientContact } from "@/lib/contactRules";
import Loader from "../elements/Loader";
import { useAppointments } from "@/hooks/useAppointments";
import { useEffect, useMemo, useRef, useState } from "react";
import { IAppointment, IMessage } from "@/types";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useUsers } from "@/hooks/useUsers";
import { useMarkMessagesSeen } from "@/hooks/useMarkMessagesSeen";
import Paginator from "../elements/Paginator";
import { useDebounce } from "@/hooks/useDebounce";
import LoaderButton from "../elements/LoaderButton";
import { hasAppointmentStarted } from "@/lib/appointments/cancellation";
import { useSalonProfile } from "@/hooks/useSalonProfile";
import {
  arrivedLabel,
  noShowLabel,
  noShowStatusLabel,
  clientNoun,
  clientNounCap,
  genderPast,
} from "@/lib/clientWording";

interface AppointmentListItemProps {
  appointment: IAppointment;
  onOpenChat: (appointment: IAppointment) => void;
  isOnline: boolean;
  clientGender?: import("@/types").ClientGender;
  /** Termin na koji je admin došao deep-linkom iz notifikacije. */
  isHighlighted?: boolean;
  /** Deep-link vodi PRAVO na zahtev: otvori ga bez dodatnog klika. */
  autoOpenRequest?: boolean;
}

// components/admin/AdminAppointments.tsx - AppointmentListItem deo
function AppointmentListItem({
  appointment,
  onOpenChat,
  isOnline,
  clientGender,
  isHighlighted = false,
  autoOpenRequest = false,
}: AppointmentListItemProps) {
  const { updateAppointmentStatus } = useAppointmentMutations();

  const unreadAdmin = appointment.unreadCount?.admin ?? 0;

  const currentAppointment = appointment;

  const [manualRequestOpen, setManualRequestOpen] = useState(false);
  const [priceModal, setPriceModal] = useState<"quote" | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [benefitOpen, setBenefitOpen] = useState(false);
  // Deep-link otvara zahtev sam, ali samo dok ga admin ne zatvori — inače bi
  // se modal vraćao pri svakom osvežavanju liste.
  const [autoOpenDismissed, setAutoOpenDismissed] = useState(false);
  const getStatusColor = (status: string) => statusMeta(status).chip;

  // Izvedeno, ne kroz efekat: postavljanje state-a u efektu lanča rendere.
  const requestOpen =
    manualRequestOpen ||
    (autoOpenRequest &&
      !autoOpenDismissed &&
      hasRequest(currentAppointment));

  const closeRequest = () => {
    setManualRequestOpen(false);
    setAutoOpenDismissed(true);
  };

  const handleStatusUpdate = (
    status: IAppointment["status"],
    pricingAmount?: number,
  ) => {
    updateAppointmentStatus.mutate({
      id: appointment._id || "",
      status,
      ...(pricingAmount != null ? { pricingAmount } : {}),
    });
  };

  // Cena se traži samo kad je stvarno nema: usluga sa fiksnom cenom ne treba
  // da prekida salon dijalogom na svaki klik.
  const needsPrice =
    currentAppointment.pricing == null ||
    currentAppointment.pricing.mode !== "fixed";
  const actionPending = updateAppointmentStatus.isPending;

  const askPrice = () => {
    if (!needsPrice) {
      handleStatusUpdate("appointment_approved");
      return;
    }
    setPriceModal("quote");
  };

  return (
    <>
    {priceModal && (
      <AppointmentPriceModal
        appointment={currentAppointment}
        kind={priceModal}
        isSaving={updateAppointmentStatus.isPending}
        onClose={() => setPriceModal(null)}
        onSkip={() => {
          handleStatusUpdate("appointment_approved");
          setPriceModal(null);
        }}
        onConfirm={(amount) => {
          handleStatusUpdate("appointment_approved", amount);
          setPriceModal(null);
        }}
      />
    )}
    {/* „Došla" je sada RAČUN: cena pre pogodnosti, popust, za naplatu i
        stvarno naplaćeno — sve server-računato (T1-4). */}
    {checkoutOpen && (
      <AppointmentCheckoutModal
        appointment={currentAppointment}
        onClose={() => setCheckoutOpen(false)}
      />
    )}
    {/* Salon primenjuje pogodnost u ime klijentkinje kada ona to kaže uživo.
        Isti server seam kao klijentski picker — nema drugog redemption toka. */}
    {benefitOpen && currentAppointment._id && (
      <LoyaltyBenefitPicker
        appointmentId={currentAppointment._id}
        audience="admin"
        onClose={() => setBenefitOpen(false)}
      />
    )}
    {requestOpen && (
      <AppointmentRequestModal
        appointment={currentAppointment}
        onClose={closeRequest}
      />
    )}
    <li
      id={`appointment-${appointment._id}`}
      className={`flex flex-col lg:flex-row justify-between gap-x-6 py-5 border-b dark:last:border-gray-900 last:border-gray-50 border-gray-200 dark:border-slate-800 transition-colors duration-500 ${
        isHighlighted
          ? "-mx-3 px-3 rounded-xl ring-2 ring-(--primary-color) bg-(--primary-color)/5"
          : ""
      }`}
    >
      <div className="flex min-w-0 gap-x-4 flex-1">
        <div className="min-w-0 flex-auto">
          {isOnline ? (
            <div className="mt-1 flex items-center gap-x-1.5">
              <div className="flex-none rounded-full animate-pulse bg-emerald-500/20 p-1">
                <div className="size-1.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-xs/5 text-gray-500">Online</p>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-x-1.5">
              <div className="flex-none rounded-full bg-red-500/20 p-1">
                <div className="size-1.5 rounded-full bg-red-500" />
              </div>
              <p className="text-xs/5 text-gray-500">Offline</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <p className="text-sm/6 font-semibold text-gray-900 dark:text-gray-300">
              {currentAppointment.clientName}
            </p>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                currentAppointment.status,
              )}`}
            >
              {currentAppointment.status === "pending" && "Na čekanju"}
              {currentAppointment.status === "appointment_approved" &&
                "Odobreno"}
              {currentAppointment.status === "appointment_rejected" &&
                "Odbijeno"}
              {currentAppointment.status === "appointment_rescheduled" &&
                "Pomerano"}
              {currentAppointment.status === "appointment_cancelled" &&
                "Otkazano"}
              {currentAppointment.status === "completed" && "Završeno"}
              {currentAppointment.status === "no_show" &&
                noShowStatusLabel(currentAppointment.noShowReason, clientGender)}
            </span>
            {hasRequest(currentAppointment) &&
              (currentAppointment.status === "pending" ? (
                // Dok čeka odobrenje, zahtev je informacija za PROCENU termina,
                // pa mora da se vidi pre nego što ga salon potvrdi.
                <button
                  type="button"
                  onClick={() => setManualRequestOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200 transition"
                >
                  {hasRequestImage(currentAppointment)
                    ? "📷 Zahtev sa fotografijom"
                    : "📝 Detalji zahteva"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setManualRequestOpen(true)}
                  aria-label="Zahtev klijentkinje"
                  title="Zahtev klijentkinje"
                  className="text-base leading-none hover:opacity-70 transition"
                >
                  {hasRequestImage(currentAppointment) ? "🖼️" : "📝"}
                </button>
              ))}
            {unreadAdmin !== 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-(--secondary-color) text-white animate-pulse">
                {unreadAdmin === 1
                  ? "Nova poruka"
                  : `${appointment?.unreadCount?.admin} novih poruka`}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs/5 text-gray-500 dark:text-gray-300">
            {displayClientContact({
              email: currentAppointment.clientEmail,
              instagram: currentAppointment.clientInstagram,
              phone: currentAppointment.clientPhone,
            })}
          </p>
          {currentAppointment.note && (
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
              <strong>Napomena {clientNoun(clientGender, "gen")}:</strong>{" "}
              {currentAppointment.note}
            </p>
          )}
          {currentAppointment.proposedDate &&
            currentAppointment.proposedTime && (
              <p className="mt-1 text-xs text-blue-600">
                <strong>Predloženi termin:</strong>{" "}
                {formatISODate(
                  currentAppointment.proposedDate +
                    "T" +
                    currentAppointment.proposedTime,
                )}
              </p>
            )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <p className="text-sm/6 font-semibold text-gray-900 dark:text-gray-300">
          {currentAppointment.serviceName.toUpperCase()}
        </p>
        <div className="mt-1 flex flex-col items-end gap-x-1.5">
          <p className="text-xs/5 text-gray-500 dark:text-gray-300">
            {currentAppointment.status === "appointment_rescheduled"
              ? `${
                  currentAppointment.lastUpdatedBy === "client"
                    ? `${clientNounCap(clientGender)} ${genderPast(clientGender, "predložila", "predložio")}`
                    : "Salon predložio"
                } termin: `
              : "Termin: "}
            <time dateTime={currentAppointment.date}>
              {formatISODate(
                currentAppointment.date + "T" + currentAppointment.time,
              )}
            </time>
          </p>
        </div>

        {/* Akcije */}
        <div className="flex gap-2 mt-2">
          {/* Odobri/Otkaži i kad klijent POMERI termin (rescheduled) — ne samo
              za prvo zakazivanje (pending). */}
          {(currentAppointment.status === "pending" ||
            currentAppointment.status === "appointment_rescheduled") && (
            <>
              <button
                onClick={askPrice}
                disabled={actionPending}
                className="cursor-pointer px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors disabled:cursor-wait disabled:opacity-60"
              >
                {actionPending ? <LoaderButton /> : "Odobri"}
              </button>
              <button
                onClick={() => handleStatusUpdate("appointment_rejected")}
                disabled={actionPending}
                className="cursor-pointer px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors disabled:cursor-wait disabled:opacity-60"
              >
                {actionPending ? <LoaderButton /> : "Otkaži"}
              </button>
            </>
          )}
          {currentAppointment.status === "appointment_approved" &&
            hasAppointmentStarted(currentAppointment) && (
              <>
                <button
                  onClick={() => setBenefitOpen(true)}
                  disabled={actionPending}
                  className="cursor-pointer px-3 py-1 bg-violet-600 text-white text-xs rounded hover:bg-violet-700 transition-colors disabled:cursor-wait disabled:opacity-60"
                >
                  Pogodnost
                </button>
                <button
                  onClick={() => setCheckoutOpen(true)}
                  disabled={actionPending}
                  className="cursor-pointer px-3 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 transition-colors disabled:cursor-wait disabled:opacity-60"
                >
                  {actionPending ? <LoaderButton /> : arrivedLabel(clientGender)}
                </button>
                <button
                  onClick={() => handleStatusUpdate("no_show")}
                  disabled={actionPending}
                  className="cursor-pointer px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors disabled:cursor-wait disabled:opacity-60"
                >
                  {actionPending ? <LoaderButton /> : noShowLabel(clientGender)}
                </button>
              </>
            )}
          <button
            onClick={() => onOpenChat(currentAppointment)}
            className="relative px-3 py-1 bg-(--primary-color)/80 text-white text-xs rounded hover:bg-(--primary-color) transition-colors"
          >
            Chat ({currentAppointment.messages.length})
            {appointment.unreadCount?.admin ? (
              <>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-(--secondary-color) rounded-full animate-ping"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-(--secondary-color) rounded-full"></div>
              </>
            ) : null}
          </button>
        </div>
      </div>
    </li>
    </>
  );
}

// components/admin/AdminAppointments.tsx - ChatModal deo
interface ChatModalProps {
  appointment: IAppointment | null;
  onClose: () => void;
}

function ChatModal({ appointment, onClose }: ChatModalProps) {
  const [message, setMessage] = useState("");
  const { sendMessage } = useAppointmentMutations();
  const { data: response, refetch } = useAppointments({
    page: 1,
    limit: 10,
  });
  const [isSending, setIsSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<IMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const appointments = useMemo(() => {
    return response?.appointments || [];
  }, [response?.appointments]);

  // Inicijalizuj lokalne poruke kada se otvori modal
  useEffect(() => {
    async function markSeen() {
      if (appointment?.messages) {
        setLocalMessages(appointment.messages);
      }
    }
    markSeen();
  }, [appointment]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [localMessages]);

  // Auto-scroll na dno kada se modal otvori
  useEffect(() => {
    if (appointment) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [appointment]);

  const currentAppointment = useMemo(() => {
    if (!appointment || !appointments) return appointment;
    const updatedAppointment =
      appointments.find((a: IAppointment) => a._id === appointment._id) ||
      appointment;

    return updatedAppointment;
  }, [appointment, appointments]);

  // Ažuriraj lokalne poruke kada se osveže sa servera
  useEffect(() => {
    async function markSeen() {
      if (currentAppointment?.messages.length !== localMessages.length) {
        setLocalMessages(currentAppointment?.messages || []);
      }
    }
    markSeen();
    // Include the messages array and localMessages.length to ensure
    // we sync when either the server messages change or the local
    // messages count changes.
  }, [currentAppointment?.messages, localMessages.length]);

  const handleSendMessage = async () => {
    if (!message.trim() || !currentAppointment?._id || isSending) return;

    setIsSending(true);

    // Optimistički dodaj poruku
    const tempMessage: IMessage = {
      _id: `temp-${Date.now()}`,
      sender: "admin",
      message: message.trim(),
      timestamp: new Date(),
    };

    setLocalMessages((prev) => [...prev, tempMessage]);
    const previousMessages = localMessages;

    try {
      await sendMessage.mutateAsync({
        appointmentId: currentAppointment._id,
        message: message.trim(),
      });
      setMessage("");

      // Osveži podatke sa servera
      setTimeout(() => {
        refetch();
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      // Vrati na prethodno stanje ako greška
      setLocalMessages(previousMessages);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!appointment) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="relative bg-slate-900 rounded-lg w-full max-w-2xl mx-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large circle top-right */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
          {/* Small circle bottom-left */}
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-purple-500/20 blur-2xl" />
          {/* Grid dots */}
          <svg
            className="absolute inset-0 w-full h-full opacity-5"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="dots"
                x="0"
                y="0"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            Chat - {appointment.clientName} - {appointment.serviceName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-100 hover:text-gray-700 cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div ref={messagesContainerRef} className="p-4 h-96 overflow-y-auto">
          {localMessages.length === 0 ? (
            <p className="text-gray-200 text-center">
              Nema poruka. Pošaljite prvu poruku.
            </p>
          ) : (
            <div>
              {localMessages.map((msg) => (
                <div
                  key={msg._id}
                  className={`mb-3 ${
                    msg.sender === "admin" ? "text-right" : ""
                  }`}
                >
                  <div
                    className={`inline-block px-4 py-2 rounded-lg max-w-xs shadow-2xl ${
                      msg.sender === "admin"
                        ? "bg-(--primary-color)/80 text-white"
                        : "bg-gray-200 text-gray-800"
                    } ${msg._id.startsWith("temp-") ? "opacity-80" : ""}`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.timestamp).toLocaleString("sr-RS", {
                        hour12: false,
                      })}
                      {msg._id.startsWith("temp-") && " (šalje se...)"}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing indicator kada se šalje poruka */}
              {isSending && (
                <div className="flex justify-end mb-3">
                  <div className="inline-block px-4 py-2 rounded-lg bg-gray-300 opacity-80">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700">
          <div className="flex flex-col lg:flex-row gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Unesite poruku..."
              className="flex-1 text-white placeholder-gray-300 border border-gray-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-(--secondary-color)"
              disabled={isSending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSending}
              className="bg-(--secondary-color) text-white px-4 py-2 rounded hover:bg-(--secondary-color)/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-20 justify-center"
            >
              {isSending ? (
                <>
                  <LoaderButton />
                </>
              ) : (
                "Pošalji"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

export default function AdminAppointments() {
  const [textQuery, setTextQuery] = useState("");
  const [dateQuery, setDateQuery] = useState("");
  const [selectedAppointment, setSelectedAppointment] =
    useState<IAppointment | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const { data: salon } = useSalonProfile();
  const clientGender = salon?.clientGender;
  const { data: users = [] } = useUsers();
  const onlineClientIds = useMemo(
    () => new Set(users.filter((user) => user.isOnline).map((user) => String(user._id))),
    [users],
  );

  // Deep-link iz notifikacije: /dashboard?tab=termini&appointmentId=<id>
  const searchParams = useSearchParams();
  const focusId = searchParams.get("appointmentId");
  // Jednom po ID-u: server kaže na kojoj je strani termin, lista skoči tamo.
  const locatedRef = useRef<string | null>(null);

  // Koristi useDebounce custom hook
  const debouncedText = useDebounce(textQuery, 500); // 500ms za text
  const debouncedDate = useDebounce(dateQuery, 300); // 300ms za date
  const debouncedStatus = useDebounce(statusFilter, 300); // 300ms za date

  const markMessagesSeen = useMarkMessagesSeen();

  // API poziv sa debounced vrednostima
  const {
    data: response,
    isLoading,
    isError,
    isFetching,
  } = useAppointments({
    page,
    limit: 10,
    search: debouncedText,
    date: debouncedDate,
    status: debouncedStatus,
  });

  const appointments = useMemo(
    () => response?.appointments || [],
    [response?.appointments],
  );
  const pagination = response?.pagination;

  // Broj neoznačenih (prošlih, a još "Odobreno") termina — podsetnik na vrhu.
  const { data: unmarkedResponse } = useAppointments({
    status: "unmarked",
    limit: 1,
  });
  const unmarkedCount = unmarkedResponse?.pagination?.totalCount ?? 0;

  // ── Deep-link: nađi stranu termina, pa skroluj i osvetli ga ────────────────
  useEffect(() => {
    if (!focusId || locatedRef.current === focusId) return;
    locatedRef.current = focusId;
    async function locate(id: string) {
      try {
        const { data } = await api.get<{ found: boolean; page: number | null }>(
          `/appointments?locate=${encodeURIComponent(id)}&limit=10`,
        );
        // Deep-link uvek pokazuje ceo spisak — bez zatečenih filtera.
        setTextQuery("");
        setDateQuery("");
        setStatusFilter("");
        if (data?.found && data.page) setPage(data.page);
        setHighlightId(id);
      } catch {
        /* ako ne uspe, lista ostaje kakva jeste */
      }
    }
    locate(focusId);
  }, [focusId]);

  // Skrol na osvetljeni termin čim se pojavi u renderovanoj listi.
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`appointment-${highlightId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, appointments]);

  const handleOpenChat = async (appointment: IAppointment) => {
    setSelectedAppointment(appointment);

    if (appointment.unreadCount?.admin ?? 0 > 0) {
      await markMessagesSeen(appointment._id!);

      setSelectedAppointment((prev) =>
        prev
          ? {
              ...prev,
              unreadCount: {
                client: prev.unreadCount?.client ?? null,
                admin: 0,
              },
            }
          : prev,
      );
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Scroll na vrh nakon promene strane
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearFilters = () => {
    setTextQuery("");
    setDateQuery("");
    setStatusFilter("");
    setPage(1);
  };

  const hasActiveFilters = debouncedText || debouncedDate || debouncedStatus;

  if (isLoading) return <Loader />;
  if (isError)
    return (
      <p className="text-center py-8 text-red-600">
        Greška pri učitavanju termina.
      </p>
    );

  return (
    <div className="space-y-6">
      {/* PODSETNIK: termini koji su prošli a nisu označeni ─────────────────── */}
      {unmarkedCount > 0 && statusFilter !== "unmarked" && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xl leading-none">⏳</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
              {unmarkedCount === 1
                ? "1 termin čeka na potvrdu da je završen"
                : `${unmarkedCount} termina čeka na potvrdu da su završeni`}
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/70 mt-0.5">
              Termin je prošao — da li je {clientNoun(clientGender)}{" "}
              {genderPast(clientGender, "došla", "došao")} na termin? Označite{" "}
              {arrivedLabel(clientGender)} ili {noShowLabel(clientGender)} da bi
              statistika i program nagrađivanja bili tačni.
            </p>
          </div>
          <button
            onClick={() => {
              setStatusFilter("unmarked");
              setPage(1);
            }}
            className="pulse-cta [--pulse-color:#d97706] cursor-pointer shrink-0 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
          >
            Prikaži ih
          </button>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className={`${card}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center md:col-span-4">
            <h3 className="font-semibold text-(--primary-color) text-lg! lg:text-2xl!">
              Lista svih termina
            </h3>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Pretraga
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ime, mejl, usluga, @instagram, @tiktok..."
                value={textQuery}
                onChange={(e) => {
                  setTextQuery(e.target.value);
                  setPage(1); // Resetuj stranu na novu pretragu
                }}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-gray-600 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)"
              />
              {isFetching && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-(--secondary-color) rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
          <div className="py-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status termina
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-(--primary-color) focus:border-transparent"
            >
              <option value="">Svi termini</option>
              <option value="unmarked">Neoznačeni (prošli)</option>
              <option value="pending">Na čekaju</option>
              <option value="completed">Završeno</option>
              <option value="approved">Odobren</option>
              <option value="rejected">Odbijen</option>
              <option value="rescheduled">Pomeren termin</option>
              <option value="cancelled">Otkazan</option>
              <option value="no_show">Nije se pojavio</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Datum
            </label>
            <input
              type="date"
              value={dateQuery}
              onChange={(e) => {
                setDateQuery(e.target.value);
                setPage(1); // Resetuj stranu na novi datum
              }}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 p-2 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)"
            />
          </div>
          <div className="flex items-end pb-2">
            <button
              onClick={handleClearFilters}
              disabled={!hasActiveFilters && page === 1}
              className="w-full cursor-pointer bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:opacity-10 disabled:dark:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Obriši filtere
            </button>
          </div>
        </div>
      </div>

      {/* RESULTS */}
      {appointments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-300">
          {hasActiveFilters
            ? "Nema pronađenih termina."
            : "Nema zakazanih termina."}
        </div>
      ) : (
        <>
          <div className={`${card}`}>
            <ul role="list" className="divide-y divide-gray-100">
              {appointments.map((appointment: IAppointment) => (
                <AppointmentListItem
                  key={appointment._id}
                  appointment={appointment}
                  onOpenChat={handleOpenChat}
                  isOnline={onlineClientIds.has(String(appointment.clientProfileId))}
                  clientGender={clientGender}
                  isHighlighted={appointment._id === highlightId}
                  autoOpenRequest={appointment._id === highlightId}
                />
              ))}
            </ul>
          </div>

          {/* Paginator */}
          {pagination && pagination.totalPages > 1 && (
            <div className={`${card}`}>
              <Paginator
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}

      {selectedAppointment && (
        <ChatModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
      )}
    </div>
  );
}
