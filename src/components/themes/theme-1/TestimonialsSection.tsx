"use client";
import { StarIcon, UserIcon } from "@heroicons/react/24/outline";

interface Testimonial {
  _id: string;
  clientName: string;
  rating: number;
  comment: string;
  adminReply?: string;
}

interface Props {
  testimonials?: Testimonial[];
  headline?: string;
}

export function Theme1TestimonialsSection({ testimonials = [], headline }: Props) {
  if (testimonials.length === 0) return null;
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-5xl lg:text-6xl font-bold text-black text-center mb-12">
          {headline || "Zadovoljni klijenti"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.slice(0, 3).map((t) => (
            <div key={t._id} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon
                    key={i}
                    className={`w-4 h-4 ${i < t.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                  />
                ))}
              </div>
              <p className="text-gray-600 text-sm italic">
                &ldquo;{t.comment}&rdquo;
              </p>
              {t.adminReply && (
                <div className="mt-3 p-3 bg-(--primary-color)/10 rounded-lg border-l-2 border-(--secondary-color)">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Salon: </span>
                    {t.adminReply}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-(--primary-color)" />
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {t.clientName}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
