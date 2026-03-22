import { StarIcon, UserIcon } from "@heroicons/react/24/outline";
interface Testimonial { _id: string; clientName: string; rating: number; comment: string; adminReply?: string }
interface Props { testimonials: Testimonial[] }

export function Theme3TestimonialsSection({ testimonials }: Props) {
  if (!testimonials.length) return null;
  return (
    <section className="bg-white py-20 lg:py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <p className="text-[#C9A990] text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">utisci</p>
        <h2 className="text-3xl font-light text-[#3D2B1F] text-center mb-14">Klijenti o nama</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.slice(0, 3).map(t => (
            <div key={t._id} className="bg-[#FAF8F5] rounded-3xl p-6 border border-[#EDE5DC] hover:border-[#C9A990] transition">
              <div className="flex gap-1 mb-4">
                {Array.from({length: 5}).map((_, i) => (
                  <StarIcon key={i} className={`w-4 h-4 ${i < t.rating ? "text-[#C9A990] fill-[#C9A990]" : "text-[#E0D5CC]"}`} />
                ))}
              </div>
              <p className="text-[#7C6A5E] text-sm italic leading-relaxed">&ldquo;{t.comment}&rdquo;</p>
              {t.adminReply && (
                <div className="mt-4 p-3 bg-[#F5EEE8] rounded-xl border-l-2 border-[#C9A990]">
                  <p className="text-xs text-[#9E7E6E]"><span className="font-medium">Salon: </span>{t.adminReply}</p>
                </div>
              )}
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[#EDE5DC]">
                <div className="w-8 h-8 rounded-full bg-[#EDE5DC] flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-[#C9A990]" />
                </div>
                <span className="text-[#5C4033] text-sm font-medium">{t.clientName}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
