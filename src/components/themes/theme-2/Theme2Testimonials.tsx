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
  headline?: string;
}

export function Theme2Testimonials({ testimonials = [], headline }: Props) {
  return (
    <section className="bg-black py-24">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-white text-4xl font-bold mb-12">
          {headline || "Utisci klijenata"}
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-[#111] border border-[#262626] p-6 rounded-xl"
            >
              <div className="flex gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon
                    key={i}
                    className={`w-4 h-4 ${i < t.rating ? "text-(--primary-color) fill-(--primary-color)" : "text-gray-200"}`}
                  />
                ))}
              </div>
              <p className="text-gray-400 text-sm mb-4">
                &quot;{t.comment}&quot;
              </p>
              <div className="text-(--primary-color)">★★★★★</div>
              <p className="text-white mt-2 text-sm font-semibold">
                {t.clientName}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
