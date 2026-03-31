"use client";

import { useState } from "react";
import { IAppointment } from "@/types";
import { useTestimonialActions } from "@/hooks/useTestimonialActions";

interface TestimonialFormProps {
  appointment: IAppointment;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function TestimonialForm({
  appointment,
  onSuccess,
  onCancel,
}: TestimonialFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const { createTestimonial } = useTestimonialActions();

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();

    createTestimonial.mutate(
      {
        appointmentId: appointment._id!,
        rating,
        comment,
      },
      {
        onSuccess: () => {
          setComment("");
          setRating(5);
          onSuccess?.();
        },
      },
    );
  };

  return (
    <form
      id="testimonial-form"
      onSubmit={handleSubmit}
      className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-300 mb-4">
        Ostavite komentar za termin: {appointment.serviceName}
      </h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Ocena:
        </label>
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="text-3xl focus:outline-none transition-transform hover:scale-110"
            >
              {star <= rating ? (
                <span className="text-yellow-400">★</span>
              ) : (
                <span className="text-gray-300">☆</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Komentar:
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Podelite svoje iskustvo sa nama..."
          className="w-full p-3 border border-gray-300 dark:border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary-color) focus:border-transparent"
          rows={4}
          required
          minLength={10}
        />
        <p className="text-xs text-gray-500 mt-1">Minimalno 10 karaktera</p>
      </div>

      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={createTestimonial.isPending || comment.length < 10}
          className="bg-(--primary-color) text-white font-semibold px-6 py-2 rounded-md hover:bg-(--secondary-color) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {createTestimonial.isPending ? "Slanje..." : "Pošalji komentar"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-200 text-gray-900 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Otkaži
          </button>
        )}
      </div>
    </form>
  );
}
