// components/ClientAppointments.tsx
import { formatISODate } from "@/helpers/formatISODate";
import { statusMeta } from "@/lib/appointmentColors";
import Loader from "../elements/Loader";
import { useAppointments } from "@/hooks/useAppointments";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { useEffect, useMemo, useRef, useState } from "react";
import { IAppointment, IMessage, IUser } from "@/types";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useUsers } from "@/hooks/useUsers";
import { useMarkMessagesSeen } from "@/hooks/useMarkMessagesSeen";
import Paginator from "../elements/Paginator";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/hooks/useAuth";

interface ClientAppointmentListItemProps {
  appointment: IAppointment;
  onOpenChat: (appointment: IAppointment) => void;
}

function ClientAppointmentListItem({
  appointment,
  onOpenChat,
}: ClientAppointmentListItemProps) {
  const { isOnline } = useUsers().data?.find(
    (u: IUser) => u._id === appointment.clientProfileId,
  ) || { isOnline: false };

  const unreadClient = appointment.unreadCount?.client ?? 0;

  // Uzmi ažurirani appointment sa najnovijim porukama
  const currentAppointment = appointment;

  const getStatusColor = (status: string) => statusMeta(status).chip;

  return (
    <li className="flex flex-col lg:flex-row justify-between gap-x-6 py-5 border-b border-gray-200 dark:border-slate-800">
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
            <p className="text-sm/6 font-semibold text-gray-900 dark:text-gray-100">
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
              {currentAppointment.status === "no_show" && "Nije došao"}
            </span>
            {unreadClient !== 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-(--secondary-color) text-white animate-pulse">
                {unreadClient === 1
                  ? "Nova poruka"
                  : `${appointment?.unreadCount?.admin} novih poruka`}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs/5 text-gray-500">
            {currentAppointment.clientEmail}
          </p>
          {currentAppointment.note && (
            <p className="mt-2 text-xs text-gray-600">
              <strong>Napomena klijenta:</strong> {currentAppointment.note}
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
        <p className="text-sm/6 font-semibold text-gray-900 dark:text-gray-100">
          {currentAppointment.serviceName.toUpperCase()}
        </p>
        <div className="mt-1 flex flex-col items-end gap-x-1.5">
          <p className="text-xs/5 text-gray-500">
            {currentAppointment.status === "appointment_rescheduled"
              ? `${
                  currentAppointment.lastUpdatedBy === "client"
                    ? "Klijent"
                    : "Salon"
                } predložio termin: `
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
          <button
            onClick={() => onOpenChat(currentAppointment)}
            className="px-3 py-1 relative bg-(--primary-color)/80 text-white text-xs rounded hover:bg-(--primary-color) transition-colors"
          >
            Chat ({currentAppointment.messages.length})
            {appointment.unreadCount?.client ? (
              <>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-(--secondary-color) rounded-full animate-ping"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-(--secondary-color) rounded-full"></div>
              </>
            ) : null}
          </button>
        </div>
      </div>
    </li>
  );
}

// components/ClientAppointments.tsx - ChatModal deo
interface ChatModalProps {
  appointment: IAppointment | null;
  onClose: () => void;
}

function ChatModal({ appointment, onClose }: ChatModalProps) {
  const [message, setMessage] = useState("");
  const { sendMessage } = useAppointmentMutations();
  const { data: response, refetch } = useAppointments();
  const [isSending, setIsSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<IMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const appointments = useMemo(() => {
    return response?.appointments || [];
  }, [response?.appointments]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  // Inicijalizuj lokalne poruke kada se otvori modal
  useEffect(() => {
    if (appointment?.messages) {
      async function init() {
        setLocalMessages(appointment!.messages);
      }
      init();
    }
  }, [appointment]);

  // Auto-scroll na dno kada se promene poruke
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
    return (
      appointments.find((a: IAppointment) => a._id === appointment._id) ||
      appointment
    );
  }, [appointment, appointments]);

  useEffect(() => {
    if (
      currentAppointment?.messages &&
      currentAppointment.messages.length !== localMessages.length
    ) {
      async function sync() {
        setLocalMessages(currentAppointment!.messages);
      }
      sync();
    }
  }, [currentAppointment, localMessages.length]);

  const handleSendMessage = async () => {
    if (!message.trim() || !currentAppointment?._id || isSending) return;

    setIsSending(true);

    // Optimistički dodaj poruku
    const tempMessage: IMessage = {
      _id: `temp-${Date.now()}`,
      sender: "client",
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
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-white">
            Chat - {appointment.clientName} - {appointment.serviceName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-100 hover:text-gray-700 size-8 cursor-pointer"
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
                    msg.sender === "client" ? "text-right" : ""
                  }`}
                >
                  <div
                    className={`inline-block px-4 py-2 rounded-lg max-w-xs shadow-2xl ${
                      msg.sender === "client"
                        ? "bg-(--secondary-color) text-white"
                        : "bg-gray-200 text-gray-800"
                    } ${msg._id.startsWith("temp-") ? "opacity-80" : ""}`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.timestamp).toLocaleString("sr-RS")}
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

        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Unesite poruku..."
              className="flex-1 text-white border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-(--primary-color)"
              disabled={isSending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSending}
              className="bg-(--primary-color) text-white px-4 py-2 rounded hover:bg-(--primary-color)/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-20 justify-center"
            >
              {isSending ? (
                <>
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                    <div
                      className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
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

const inp = [
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm",
  "text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800",
  "focus:outline-none focus:ring-2 focus:ring-violet-400 transition",
  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
].join(" ");

const lbl =
  "block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5";
const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

export default function ClientAppointments() {
  const [textQuery, setTextQuery] = useState("");
  const [dateQuery, setDateQuery] = useState("");
  const [selectedAppointment, setSelectedAppointment] =
    useState<IAppointment | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  // Koristi useDebounce custom hook
  const debouncedText = useDebounce(textQuery, 500); // 500ms za text
  const debouncedDate = useDebounce(dateQuery, 300); // 300ms za date
  const debouncedStatus = useDebounce(statusFilter, 300); // 300ms za date

  const markMessagesSeen = useMarkMessagesSeen();

  const { user } = useAuth();

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
    clientId: user?.tenantUserId ?? undefined,
  });

  const appointments = useMemo(() => {
    return response?.appointments || [];
  }, [response?.appointments]);

  const pagination = response?.pagination;

  const handleOpenChat = async (appointment: IAppointment) => {
    setSelectedAppointment(appointment);

    // Ako je admin i ima nepročitanih poruka
    if (appointment.unreadCount?.client ?? 0 > 0) {
      await markMessagesSeen(appointment._id!);
      // Ažuriraj lokalni state samo za ChatModal prikaz
      setSelectedAppointment((prev) =>
        prev
          ? {
              ...prev,
              unreadCount: {
                admin: prev.unreadCount?.admin ?? null,
                client: 0,
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
  if (isError) return <p>Greška pri učitavanju termina.</p>;

  return (
    <div className="space-y-6">
      {/* SEARCH BAR */}
      <div className="py-4 rounded-lg">
        <div className={card}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center lg:col-span-4">
              <h3 className="font-semibold text-(--primary-color) dark:text-gray-100 text-lg! lg:text-2xl!">
                Moji termini
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pretraga
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ime, email, usluga..."
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
              <label className="block text-sm font-medium dark:text-gray-100 text-gray-700 mb-1">
                Status termina
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-(--primary-color) focus:border-transparent"
              >
                <option value="">Svi termini</option>
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
      </div>

      {appointments.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          Nemate zakazanih termina.
        </p>
      ) : (
        <>
          <ul role="list" className="divide-y divide-gray-100">
            {appointments.map((appointment: IAppointment) => (
              <ClientAppointmentListItem
                key={appointment._id}
                appointment={appointment}
                onOpenChat={handleOpenChat}
              />
            ))}
          </ul>
          {/* Paginator */}
          {pagination && pagination.totalPages > 1 && (
            <Paginator
              pagination={pagination}
              onPageChange={handlePageChange}
            />
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
