import { FadeUp } from "./FadeUp";

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

type Card = {
  quote: string;
  name: string;
  meta: string;
  initial: string;
  rating: number;
};

const DEFAULT_CARDS: Card[] = [
  {
    quote:
      "I have never felt more put together. Anja is an artist — I get stopped on the street.",
    name: "Mila K.",
    meta: "Volume Set",
    initial: "M",
    rating: 5,
  },
  {
    quote:
      "A little pink sanctuary. I leave relaxed and looking incredible every single time.",
    name: "Sara D.",
    meta: "Hybrid Set",
    initial: "S",
    rating: 5,
  },
  {
    quote:
      "Six months a client and I will never go anywhere else. Flawless retention.",
    name: "Lena P.",
    meta: "Lash Lift",
    initial: "L",
    rating: 5,
  },
];

export function Theme7TestimonialsSection({ testimonials, headline }: Props) {
  const cards: Card[] =
    testimonials && testimonials.length > 0
      ? testimonials.slice(0, 3).map((t) => ({
          quote: t.comment,
          name: t.clientName,
          meta: "Klijent",
          initial: (t.clientName || "?").trim().charAt(0).toUpperCase(),
          rating: t.rating || 5,
        }))
      : DEFAULT_CARDS;

  return (
    <section id="reviews" className="bg-paper">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-28 lg:py-36">
        <FadeUp className="max-w-3xl mb-16">
          <p className="flex items-center gap-3 text-[12px] uppercase tracking-[0.3em] text-neon mb-5">
            <span className="h-px w-10 bg-neon" /> {headline || "Kind words"}
          </p>
          <h2 className="font-cormorant text-5xl sm:text-6xl lg:text-7xl leading-[0.98] tracking-[-0.01em]">
            Loved by the chair.
          </h2>
        </FadeUp>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {cards.map((c, i) => (
            <FadeUp key={i} delay={i * 0.08}>
              <figure className="h-full flex flex-col justify-between rounded-[22px] bg-white ring-1 ring-black/5 p-8 lg:p-9 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.3)] transition-all duration-500">
                <div className="text-neon text-lg tracking-[0.15em] mb-5">
                  {"★".repeat(Math.max(0, Math.min(5, c.rating)))}
                  <span className="text-ink/15">
                    {"★".repeat(5 - Math.max(0, Math.min(5, c.rating)))}
                  </span>
                </div>
                <blockquote className="font-cormorant text-2xl lg:text-[1.7rem] leading-snug text-ink/85">
                  &ldquo;{c.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-8 flex items-center gap-3">
                  <span className="grid place-items-center h-10 w-10 rounded-full bg-rose font-cormorant text-lg text-ink">
                    {c.initial}
                  </span>
                  <span>
                    <span className="block text-[15px] font-medium">
                      {c.name}
                    </span>
                    <span className="block text-[11px] uppercase tracking-[0.18em] text-ink/40">
                      {c.meta}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
