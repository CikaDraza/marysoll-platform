// components/admin/TestimonialCard.tsx
"use client";

import { useState } from "react";
import { useTestimonialActions } from "@/hooks/useTestimonialActions";
import { ITestimonial } from "@/types";
import { getAppointmentInfo } from "@/helpers/testimonialHelpers";
import AlertModal from "../modals/AlertModal";

interface TestimonialCardProps {
  testimonial: ITestimonial<{
    _id: string;
    serviceName: string;
    date: string;
  }>;
}

export default function TestimonialCard({ testimonial }: TestimonialCardProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState(testimonial.adminReply || "");
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const { updateTestimonial, deleteTestimonial, markAsRead, approveTestimonial } =
    useTestimonialActions();

  // Koristi helper funkciju - sada je testimonial striktnog tipa
  const appointmentInfo = getAppointmentInfo(testimonial);

  const handleReply = async () => {
    setIsReplying(true);
    setReplyText(testimonial.adminReply || "");

    if (!testimonial.isRead) {
      try {
        await markAsRead.mutateAsync(testimonial._id);
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    }
  };

  const submitReply = async () => {
    await updateTestimonial.mutateAsync(
      {
        id: testimonial._id,
        data: { adminReply: replyText },
      },
      {
        onSuccess: () => {
          setIsReplying(false);
          setReplyText("");
        },
      },
    );
    await markAsRead.mutateAsync(testimonial._id);
  };

  const cancelReply = () => {
    setIsReplying(false);
    setReplyText("");
  };

  const confirmDelete = () => {
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteTestimonial.mutateAsync(testimonial._id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className={`rounded-lg p-4 ${
        !testimonial.isRead ? "bg-gray-50" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex flex-col lg:flex-row justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-x-4 mb-2">
            <h3 className="font-semibold text-gray-900">
              {testimonial.clientName}
            </h3>
            {!testimonial.isRead && (
              <span className="inline-block mt-1 px-2 py-1 text-xs font-medium animate-pulse bg-(--secondary-color) text-white rounded-full">
                Nov
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {appointmentInfo.serviceName} - {appointmentInfo.date}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex text-yellow-400">
            {"★".repeat(testimonial.rating)}
            {"☆".repeat(5 - testimonial.rating)}
          </div>
          {testimonial.isApproved ? (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
              Odobreno
            </span>
          ) : (
            <button
              onClick={() => approveTestimonial.mutate(testimonial._id)}
              disabled={approveTestimonial.isPending}
              className="text-green-600 hover:text-green-800 underline text-sm font-medium cursor-pointer disabled:opacity-50"
            >
              {approveTestimonial.isPending ? "..." : "Odobri"}
            </button>
          )}
          <button
            onClick={confirmDelete}
            disabled={deleteTestimonial.isPending}
            className="cursor-pointer text-red-600 hover:text-red-800 text-sm disabled:opacity-50 underline"
          >
            {deleteTestimonial.isPending ? "Brisanje..." : "Obriši"}
          </button>
        </div>
      </div>

      <p className="text-gray-700 mb-3">{testimonial.comment}</p>

      {testimonial.adminReply && !isReplying ? (
        <div className="bg-gray-50 p-3 rounded-xl">
          <p className="text-sm font-semibold text-gray-900">Vaš odgovor:</p>
          <p className="text-gray-700">{testimonial.adminReply}</p>
          <button
            onClick={handleReply}
            className="underline cursor-pointer text-(--primary-color) hover:text-(--primary-color-dark) text-sm mt-2"
          >
            Izmeni odgovor
          </button>
        </div>
      ) : isReplying ? (
        <div className="space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Napišite odgovor..."
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-(--primary-color) focus:border-transparent"
            rows={3}
          />
          <div className="flex space-x-2">
            <button
              onClick={submitReply}
              disabled={updateTestimonial.isPending}
              className="cursor-pointer bg-(--primary-color) text-white px-4 py-2 rounded-md hover:bg-(--primary-color)/80 disabled:opacity-50"
            >
              {updateTestimonial.isPending ? "Slanje..." : "Pošalji odgovor"}
            </button>
            <button
              onClick={cancelReply}
              className="cursor-pointer bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200"
            >
              Otkaži
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleReply}
          className="bg-(--secondary-color) text-white px-4 py-2 rounded-md hover:bg-(--secondary-color)/80 cursor-pointer"
        >
          Odgovori
        </button>
      )}
      <AlertModal
        open={isAlertOpen}
        setOpen={setIsAlertOpen}
        onConfirm={handleDelete}
        title="Obriši preporuku"
        message="Da li ste sigurni da želite da obrišete ovu preporuku? Ova akcija se ne može opozvati."
      />
    </div>
  );
}
