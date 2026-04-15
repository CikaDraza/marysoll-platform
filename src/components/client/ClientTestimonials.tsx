// components/client/ClientTestimonials.tsx
"use client";

import { useState, useMemo } from "react";
import { useClientTestimonials } from "@/hooks/useClientTestimonials";
import { useAppointments } from "@/hooks/useAppointments";
import { ITestimonial, IAppointment, PaginationInfo } from "@/types";
import TestimonialForm from "./TestimonialForm";
import { ChatBubbleOvalLeftEllipsisIcon } from "@heroicons/react/24/outline";
import { getUserFromToken } from "@/lib/auth/auth-client";
import { Toaster } from "react-hot-toast";
import { useTestimonialActions } from "@/hooks/useTestimonialActions";
import { useBrowserNotifications } from "@/hooks/useNotifications";
import Loader from "../elements/Loader";
import { formatISODate } from "@/helpers/formatISODate";
import { getServiceName } from "@/helpers/testimonialHelpers";
import { useDebounce } from "@/hooks/useDebounce";
import Paginator from "../elements/Paginator";

const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

export default function ClientTestimonials() {
  const [showForm, setShowForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<IAppointment | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ rating: 5, comment: "" });
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateQuery, setDateQuery] = useState("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchQuery, 500);
  const debouncedDate = useDebounce(dateQuery, 300);

  // Podaci
  const {
    data: res,
    isLoading,
    error,
    isFetching,
  } = useClientTestimonials({
    status: (statusFilter as "all" | "read" | "unread") || "all",
    page,
    limit: 10,
    search: debouncedSearch,
    date: debouncedDate,
  });
  const { data: response } = useAppointments();
  const { updateTestimonial, markClientAsRead } = useTestimonialActions();
  const currentUser = getUserFromToken();

  const clientTestimonials = useMemo(() => {
    return res?.testimonials || [];
  }, [res?.testimonials]);

  const pagination: PaginationInfo = res?.pagination || {
    page,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  const appointments = useMemo(() => {
    return response?.appointments || [];
  }, [response?.appointments]);

  // Termini bez komentara
  const appointmentsWithoutTestimonial = useMemo(() => {
    return appointments.filter((appointment) => {
      try {
        const isClientAppointment = appointment.clientProfileId === currentUser?.tenantUserId;

        if (!isClientAppointment) return false;

        const hasTestimonial = clientTestimonials.some((testimonial) => {
          // Bezbedna provera
          const appointmentId =
            testimonial?.appointmentId?._id || testimonial?.appointmentId;
          return appointmentId === appointment._id;
        });

        return isClientAppointment && !hasTestimonial;
      } catch (error) {
        console.error("Error processing appointment:", appointment._id, error);
        return false;
      }
    });
  }, [appointments, clientTestimonials, currentUser]);

  // Grupisanje komentara
  const { testimonialsWithReply, testimonialsWithoutReply } = useMemo(() => {
    if (!clientTestimonials)
      return {
        testimonialsWithReply: [],
        testimonialsWithoutReply: [],
      };

    const withReply = clientTestimonials.filter(
      (t) => t.adminReply && t.isRead,
    );
    const withoutReply = clientTestimonials.filter(
      (t) => t.comment && t.appointmentId,
    );

    return {
      testimonialsWithReply: withReply,
      testimonialsWithoutReply: withoutReply,
    };
  }, [clientTestimonials]);

  // Funkcije
  const handleEdit = (
    testimonial: ITestimonial<{
      _id: string;
      serviceName: string;
      date: string;
    }>,
  ) => {
    setEditingId(testimonial._id);
    setEditData({ rating: testimonial.rating, comment: testimonial.comment });
  };

  const submitEdit = (testimonialId: string) => {
    updateTestimonial.mutate(
      {
        id: testimonialId,
        data: editData,
      },
      {
        onSuccess: () => {
          setEditingId(null);
        },
      },
    );
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleCreateTestimonial = (appointment: IAppointment) => {
    setSelectedAppointment(appointment);
    setShowForm(true);
    // scroll do forme
    setTimeout(() => {
      document.getElementById("testimonial-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedAppointment(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedAppointment(null);
  };

  const handleClientAsRead = async (testimonialId: string) => {
    markClientAsRead.mutate(testimonialId);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => {
    setStatusFilter("");
    setSearchQuery("");
    setDateQuery("");
    setPage(1);
  };

  const hasActiveFilters = statusFilter || debouncedSearch || debouncedDate;

  useBrowserNotifications();

  if (isLoading) return <Loader />;
  if (error)
    return (
      <div className="text-center py-8 text-red-600">Greška pri učitavanju</div>
    );

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className={card}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center lg:col-span-4">
            <h2 className="text-2xl! font-bold text-(--secondary-color) dark:text-white">
              Komentari o vašem iskustvu
            </h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status komentara
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-(--primary-color) focus:border-transparent"
            >
              <option value="">Svi komentari</option>
              <option value="unread">Nepročitani</option>
              <option value="read">Pročitani</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Pretraga
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ime, email, komentar..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-1.5 px-3 focus:ring-2 focus:ring-(--primary-color) focus:border-transparent dark:placeholder:text-gray-300"
              />
              {isFetching && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-(--secondary-color) rounded-full animate-spin"></div>
                </div>
              )}
            </div>
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
                setPage(1);
              }}
              className="w-full p-1.5 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-(--primary-color)! focus:border-transparent"
            />
          </div>

          {/* Clear filter */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters && page === 1}
              className="cursor-pointer bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:opacity-10 dark:disabled:opacity-30 disabled:cursor-not-allowed transition-colors w-full"
            >
              Obriši filtere
            </button>
          </div>
        </div>
        {/* Prikaz aktivnih filtera */}
        {hasActiveFilters && (
          <div className="filters mt-3 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Aktivni filteri:
            </span>

            {statusFilter && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Status:{" "}
                {statusFilter === "unread" ? "Nepročitani" : "Pročitani"}
                <button
                  onClick={() => setStatusFilter("")}
                  className="ml-1 hover:text-green-600 cursor-pointer"
                >
                  {" × "}
                </button>
              </span>
            )}

            {debouncedSearch && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Pretraga: {debouncedSearch}
                <button
                  onClick={() => setSearchQuery("")}
                  className="ml-1 hover:text-blue-600 cursor-pointer"
                >
                  {" × "}
                </button>
              </span>
            )}

            {debouncedDate && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Datum: {debouncedDate}
                <button
                  onClick={() => setDateQuery("")}
                  className="ml-1 hover:text-purple-600 cursor-pointer"
                >
                  {" × "}
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Forma za novi komentar */}
      {showForm && selectedAppointment && (
        <TestimonialForm
          appointment={selectedAppointment}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {/* Sekcija 1: Termini bez komentara */}
      {appointmentsWithoutTestimonial.length > 0 && (
        <div className={card}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-300 mb-4">
            Termini koji čekaju vaš komentar (
            {appointmentsWithoutTestimonial.length})
          </h3>
          <div className="space-y-3">
            {appointmentsWithoutTestimonial.map((appointment) => (
              <div
                key={appointment._id}
                className="flex justify-between items-center p-4 rounded-lg shadow-xs"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-300 text-lg">
                    {appointment.serviceName}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {new Date(appointment.date).toLocaleDateString("sr-RS")} u{" "}
                    {appointment.time}
                  </p>
                  {appointment.note && (
                    <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                      Napomena: {appointment.note}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleCreateTestimonial(appointment)}
                  className="cursor-pointer bg-(--secondary-color) text-white p-3 rounded-full hover:bg-(--secondary-color)/80 transition-colors ml-4"
                >
                  <ChatBubbleOvalLeftEllipsisIcon className="size-6" />
                </button>
              </div>
            ))}
          </div>
          {/* Paginator */}
          {pagination && pagination.totalPages > 1 && (
            <Paginator
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}

      {/* Sekcija 2: Komentari bez odgovora */}
      {testimonialsWithoutReply.length > 0 && (
        <div className={card}>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-300">
            Ostavili ste komentar ({testimonialsWithoutReply.length})
          </h3>
          {testimonialsWithoutReply.map((testimonial) => (
            <TestimonialItem
              key={testimonial._id}
              testimonial={testimonial}
              editingId={editingId}
              editData={editData}
              onEdit={handleEdit}
              onClientMarkAsRead={handleClientAsRead}
              onSubmitEdit={submitEdit}
              onCancelEdit={cancelEdit}
              updatePending={updateTestimonial.isPending}
              setEditData={setEditData}
              pagination={pagination}
              handlePageChange={handlePageChange}
            />
          ))}
        </div>
      )}

      {/* Sekcija 3: Komentari sa odgovorom Salona */}
      {testimonialsWithReply.length > 0 && (
        <div className={card}>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-300">
            Sa odgovorom salona ({testimonialsWithReply.length})
          </h3>
          {testimonialsWithReply.map((testimonial) => (
            <TestimonialItem
              key={testimonial._id}
              testimonial={testimonial}
              editingId={editingId}
              editData={editData}
              onEdit={handleEdit}
              onSubmitEdit={submitEdit}
              onCancelEdit={cancelEdit}
              onClientMarkAsRead={handleClientAsRead}
              updatePending={updateTestimonial.isPending}
              setEditData={setEditData}
              pagination={pagination}
              handlePageChange={handlePageChange}
            />
          ))}
        </div>
      )}
      {/* Prazno stanje */}
      {appointmentsWithoutTestimonial.length === 0 &&
        clientTestimonials.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-300">
            <p className="text-lg">
              Trenutno nemate termine za komentarisanje.
            </p>
            <p className="text-sm mt-2 dark:text-gray-300">
              Kada zakazete termin, ovde ćete moći da ostavite komentar.
            </p>
          </div>
        )}
    </div>
  );
}

// TestimonialItem komponenta
function TestimonialItem({
  testimonial,
  editingId,
  editData,
  onEdit,
  onSubmitEdit,
  onCancelEdit,
  updatePending,
  setEditData,
  onClientMarkAsRead,
  pagination,
  handlePageChange,
}: {
  testimonial: ITestimonial<{
    _id: string;
    serviceName: string;
    date: string;
  }>;
  editingId: string | null;
  editData: { rating: number; comment: string };
  onEdit: (
    testimonial: ITestimonial<{
      _id: string;
      serviceName: string;
      date: string;
    }>,
  ) => void;
  onSubmitEdit: (testimonialId: string) => void;
  onCancelEdit: () => void;
  updatePending: boolean;
  onClientMarkAsRead: (testimonialId: string) => void;
  setEditData: React.Dispatch<
    React.SetStateAction<{ rating: number; comment: string }>
  >;
  pagination: PaginationInfo;
  handlePageChange: (page: number) => void;
}) {
  return (
    <div className="rounded-lg p-6">
      {editingId === testimonial._id ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ocena:
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() =>
                    setEditData((prev) => ({ ...prev, rating: star }))
                  }
                  className="text-yellow-400 text-3xl focus:outline-none transition-transform hover:scale-110"
                >
                  {star <= editData.rating ? "★" : "☆"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Komentar:
            </label>
            <textarea
              value={editData.comment}
              onChange={(e) =>
                setEditData((prev) => ({
                  ...prev,
                  comment: e.target.value,
                }))
              }
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-(--primary-color) focus:border-transparent"
              rows={4}
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => onSubmitEdit(testimonial._id)}
              disabled={updatePending}
              className="bg-(--primary-color) text-white px-6 py-2 rounded-md hover:bg-(--primary-color)/90 disabled:opacity-50 transition-colors"
            >
              {updatePending ? "Čuvanje..." : "Sačuvaj promene"}
            </button>
            <button
              onClick={onCancelEdit}
              className="bg-gray-200 text-gray-900 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
            >
              Otkaži
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col lg:flex-row justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {testimonial.clientName}
                  {" - "}
                  {getServiceName(testimonial)}
                  {" - "}
                  <span className="text-xs lg:text-md text-gray-500 font-normal">
                    {formatISODate(testimonial.updatedAt)}
                  </span>
                </h3>
                {/* Indikator za nepročitane komentare SA ODGOVOROM */}
                {!testimonial.isRead && (
                  <div className="relative flex items-center gap-2">
                    <div className="flex-none rounded-full bg-purple-500/20 p-1">
                      <div className="size-2.5 rounded-full animate-pulse bg-purple-500" />
                    </div>
                    <span className="text-xs text-purple-600 font-medium">
                      Nov odgovor
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {/* {new Date(testimonial.appointmentId.date).toLocaleDateString(
                  "sr-RS"
                )} */}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex text-yellow-400 text-xl">
                {"★".repeat(testimonial.rating)}
                {"☆".repeat(5 - testimonial.rating)}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onEdit(testimonial)}
                  className="text-(--primary-color) hover:text-(--primary-color)/80 text-sm font-medium underline cursor-pointer"
                >
                  Izmeni
                </button>
                {/* Dugme za označavanje kao pročitano - samo za komentare sa odgovorom i ako nisu pročitani */}
                {!testimonial.isClientRead && testimonial.adminReply && (
                  <button
                    onClick={() => onClientMarkAsRead(testimonial._id)}
                    className="text-(--red-color) hover:text-(--red-color)/80 underline text-xs lg:text-sm font-medium cursor-pointer"
                  >
                    Označi pročitanim
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="text-gray-700 mb-4 text-base leading-relaxed">
            {testimonial.comment}
          </p>

          {testimonial.adminReply && (
            <div className="bg-(--secondary-color)/10 p-4 rounded-xl border border-(--secondary-color)/20">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                Odgovor salona:
              </p>
              <p className="text-gray-700 text-base leading-relaxed">
                {testimonial.adminReply}
              </p>
            </div>
          )}
          {/* Paginator */}
          {pagination && pagination.totalPages > 1 && (
            <Paginator
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}
