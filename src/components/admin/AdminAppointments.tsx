import { formatISODate } from "@/helpers/formatISODate";
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

interface AppointmentListItemProps {
  appointment: IAppointment;
  onOpenChat: (appointment: IAppointment) => void;
}

// components/admin/AdminAppointments.tsx - AppointmentListItem deo
function AppointmentListItem({
  appointment,
  onOpenChat,
}: AppointmentListItemProps) {
  const { updateAppointmentStatus } = useAppointmentMutations();
  const { data: response, isLoading, isError, isFetching } = useAppointments();
  const { isOnline } = useUsers().data?.find(
    (u) => u._id === appointment.clientProfileId,
  ) || { isOnline: false };

  const appointments = useMemo(() => {
    return response?.appointments || [];
  }, [response?.appointments]);

  const unreadAdmin = appointment.unreadCount?.admin ?? 0;

  // Uzmi ažurirani appointment sa najnovijim porukama
  const currentAppointment = useMemo(() => {
    if (!appointments) return appointment;
    return (
      appointments.find((a: IAppointment) => a._id === appointment._id) ||
      appointment
    );
  }, [appointment, appointments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "appointment_approved":
        return "bg-green-100 text-green-800";
      case "appointment_rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "appointment_rescheduled":
        return "bg-blue-100 text-blue-800";
      case "appointment_cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleStatusUpdate = (status: IAppointment["status"]) => {
    updateAppointmentStatus.mutate({
      id: appointment._id || "",
      status,
    });
  };

  return (
    <li className="flex flex-col lg:flex-row justify-between gap-x-6 py-5 border-b dark:last:border-gray-900 last:border-gray-50 border-gray-200 dark:border-slate-800">
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
            </span>
            {unreadAdmin !== 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-(--secondary-color) text-white animate-pulse">
                {unreadAdmin === 1
                  ? "Nova poruka"
                  : `${appointment?.unreadCount?.admin} novih poruka`}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs/5 text-gray-500 dark:text-gray-300">
            {currentAppointment.clientEmail}
          </p>
          {currentAppointment.note && (
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
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
        <p className="text-sm/6 font-semibold text-gray-900 dark:text-gray-300">
          {currentAppointment.serviceName.toUpperCase()}
        </p>
        <div className="mt-1 flex flex-col items-end gap-x-1.5">
          <p className="text-xs/5 text-gray-500 dark:text-gray-300">
            {`${
              currentAppointment.lastUpdatedBy === "client"
                ? "Klijent"
                : "Salon"
            } predložio termin`}
            :{" "}
            <time dateTime={currentAppointment.date}>
              {formatISODate(
                currentAppointment.date + "T" + currentAppointment.time,
              )}
            </time>
          </p>
        </div>

        {/* Akcije */}
        <div className="flex gap-2 mt-2">
          {currentAppointment.status === "pending" && (
            <>
              <button
                onClick={() => handleStatusUpdate("appointment_approved")}
                className="cursor-pointer px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
              >
                {isLoading || isFetching ? (
                  isError ? (
                    "greška"
                  ) : (
                    <LoaderButton />
                  )
                ) : (
                  "Odobri"
                )}
              </button>
              <button
                onClick={() => handleStatusUpdate("appointment_rejected")}
                className="cursor-pointer px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
              >
                {isLoading || isFetching ? (
                  isError ? (
                    "greška"
                  ) : (
                    <LoaderButton />
                  )
                ) : (
                  "Otkaži"
                )}
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
    if (appointment?.messages) {
      setLocalMessages(appointment.messages);
    }
  }, [appointment]);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  const currentAppointment = useMemo(() => {
    if (!appointment || !appointments) return appointment;
    const updatedAppointment =
      appointments.find((a: IAppointment) => a._id === appointment._id) ||
      appointment;

    // Ažuriraj lokalne poruke kada se osveže sa servera
    if (updatedAppointment.messages.length !== localMessages.length) {
      setLocalMessages(updatedAppointment.messages);
    }

    return updatedAppointment;
  }, [appointment, appointments, localMessages]);

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
                      {new Date(msg.timestamp).toLocaleString()}
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

  const appointments = response?.appointments || [];
  const pagination = response?.pagination;

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
