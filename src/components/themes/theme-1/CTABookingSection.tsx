import Image from "next/image";
import { BookingCtaLink } from "../shared/BookingCtaLink";

interface Props {
  salonName?: string;
  tenantSlug?: string;
}

export function Theme1CTABookingSection({ salonName, tenantSlug }: Props) {
  const servicesHref = tenantSlug ? `/${tenantSlug}/termini` : "/termini";
  return (
    <section className="py-24 lg:py-44 bg-(--secondary-color) py-20 px-6 text-right">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        <div>
          <h2 className="text-white text-3xl lg:text-4xl font-bold mb-4">
            Rezerviši termin za 30 sekundi.
          </h2>
          <p className="text-white/80 text-sm mb-8 max-w-md mx-auto">
            Jednostavno i brzo online zakazivanje. Izaberite uslugu, datum i
            vreme koji vam odgovara. {salonName ?? ""}
          </p>
          <BookingCtaLink
            href={servicesHref}
            className="inline-block px-10 py-4 bg-white text-(--secondary-color) font-bold rounded-full hover:bg-gray-100 transition shadow-xl text-sm"
          >
            Zakaži odmah →
          </BookingCtaLink>
        </div>
        <div className="w-full max-w-lg rounded-lg overflow-hidden">
          {/* Intrinsic 466×600. Deklarisano je bilo 500×500 (kvadrat), pa je
              `height: auto` iz Tailwind preflight-a računao 644px umesto 500 —
              promenjena samo visina, što Next prijavljuje kao narušen odnos
              stranica. Širina prikaza ostaje 500px i vodi je CSS. */}
          <Image
            src={
              "https://res.cloudinary.com/dufo1t5li/image/upload/v1780291103/ae13fecc-663a-4268-bdee-095ca7d4e36b_removalai_preview_xjyjuf.png"
            }
            alt={
              "Makeup artist applying makeup to a client, statued in a modern, minimalist style"
            }
            width={466}
            height={600}
            className="w-[500px] h-auto max-w-full object-cover object-top"
          />
        </div>
      </div>
    </section>
  );
}
