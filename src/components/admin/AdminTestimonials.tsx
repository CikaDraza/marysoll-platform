// components/admin/AdminTestimonials.tsx
"use client";

import { useState, useMemo } from "react";
import { useAdminTestimonials } from "@/hooks/useAdminTestimonials";
import Loader from "../elements/Loader";
import { Toaster } from "react-hot-toast";
import TestimonialCard from "./TestimonialCard";
import { useTestimonialActions } from "@/hooks/useTestimonialActions";
import { useBrowserNotifications } from "@/hooks/useNotifications";
import Paginator from "../elements/Paginator";
import { useDebounce } from "@/hooks/useDebounce";

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

export default function AdminTestimonials() {
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateQuery, setDateQuery] = useState("");
  const [page, setPage] = useState(1);

  // Debounced vrednosti
  const debouncedSearch = useDebounce(searchQuery, 500);
  const debouncedDate = useDebounce(dateQuery, 300);

  const {
    data: response,
    isLoading,
    error,
    isFetching,
  } = useAdminTestimonials({
    status: (statusFilter as "all" | "read" | "unread") || "all",
    page,
    limit: 10,
    search: debouncedSearch,
    date: debouncedDate,
  });

  const { markAsRead } = useTestimonialActions();

  const testimonials = useMemo(() => {
    return response?.testimonials || [];
  }, [response?.testimonials]);

  const pagination = response?.pagination;

  // Grupisanje komentara
  const { unreadTestimonials, readTestimonials } = useMemo(() => {
    if (!testimonials) return { unreadTestimonials: [], readTestimonials: [] };

    const unread = testimonials.filter((t) => !t.isRead);
    const read = testimonials.filter((t) => t.isRead);

    return { unreadTestimonials: unread, readTestimonials: read };
  }, [testimonials]);

  const handleMarkAsRead = async (testimonialId: string) => {
    markAsRead.mutate(testimonialId);
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

  useBrowserNotifications();

  const hasActiveFilters = statusFilter || debouncedSearch || debouncedDate;

  if (isLoading) return <Loader />;
  if (error)
    return (
      <div className="text-center py-8 text-red-600 font-semibold">
        Greška pri učitavanju
      </div>
    );

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Filteri */}
      <div className="py-4 rounded-lg">
        <div className={card}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center lg:col-span-4">
              <h2 className="text-lg! lg:text-2xl! font-bold text-(--secondary-color)">
                Lista Preporuka
              </h2>
            </div>

            <div>
              <label className={lbl}>Status komentara</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className={inp}
              >
                <option value="">Svi komentari</option>
                <option value="unread">Nepročitani</option>
                <option value="read">Pročitani</option>
              </select>
            </div>

            <div>
              <label className={lbl}>Pretraga</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ime, email, komentar..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className={inp}
                />
                {isFetching && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-(--secondary-color) rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={lbl}>Datum</label>
              <input
                type="date"
                value={dateQuery}
                onChange={(e) => {
                  setDateQuery(e.target.value);
                  setPage(1);
                }}
                className={inp}
              />
            </div>

            {/* Clear filter */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                disabled={!hasActiveFilters && page === 1}
                className="cursor-pointer bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:opacity-10 disabled:cursor-not-allowed transition-colors w-full"
              >
                Obriši filtere
              </button>
            </div>
          </div>
        </div>

        {/* Prikaz aktivnih filtera */}
        {hasActiveFilters && (
          <div className="filters mt-3 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Aktivni filteri:</span>

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

      {testimonials.length !== 0 ? (
        <div className="text-center py-8 text-gray-500">
          {hasActiveFilters
            ? "Nema komentara koji odgovaraju filterima."
            : "Nema komentara klijenata."}
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {/* Nepročitani komentari */}
            {unreadTestimonials.length > 0 && (
              <div className={card}>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-md lg:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Nepročitani komentari
                  </h3>
                  <span className="px-3 py-1 bg-red-100 text-red-800 text-xs lg:text-sm font-medium rounded-full">
                    {unreadTestimonials.length} novo
                  </span>
                </div>
                <div className="space-y-4">
                  {unreadTestimonials.map((testimonial) => (
                    <div key={testimonial._id} className="relative">
                      <TestimonialCard
                        testimonial={testimonial}
                        handleMarkAsRead={handleMarkAsRead}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pročitani komentari */}
            {readTestimonials.length > 0 && (
              <div className={card}>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Pročitani komentari ({readTestimonials.length})
                </h3>
                <div className="space-y-4">
                  {readTestimonials.map((testimonial) => (
                    <TestimonialCard
                      key={testimonial._id}
                      testimonial={testimonial}
                      handleMarkAsRead={handleMarkAsRead}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

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
