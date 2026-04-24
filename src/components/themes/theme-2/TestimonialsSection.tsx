import { StarIcon, UserIcon } from "@heroicons/react/24/outline";

interface Testimonial {
  _id: string;
  clientName: string;
  rating: number;
  comment: string;
  adminReply?: string;
}
interface Props {
  testimonials: Testimonial[];
}

export function Theme2TestimonialsSection({ testimonials }: Props) {
  if (!testimonials.length) return null;
  return (
    <section className="bg-gray-950 py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="w-12 h-0.5 bg-(--primary-color) mx-auto mb-4" />
        <h2 className="text-3xl font-black text-white text-center mb-16">
          Zadovoljni klijenti
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.slice(0, 3).map((t) => (
            <div
              key={t._id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-(--primary-color)/20 transition"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon
                    key={i}
                    className={`w-4 h-4 ${i < t.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-700"}`}
                  />
                ))}
              </div>
              <p className="text-gray-400 text-sm italic leading-relaxed">
                &ldquo;{t.comment}&rdquo;
              </p>
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-800">
                <div className="w-8 h-8 rounded-full bg-(--primary-color) border border-(--primary-color)/20 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-(--primary-color)" />
                </div>
                <span className="text-gray-300 text-sm font-semibold">
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
