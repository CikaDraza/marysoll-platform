import type { AboutTextLink } from "@/types";
import { renderLinkedText } from "@/helpers/renderLinkedText";
import Image from "next/image";

const DEFAULT_PARAGRAPHS = [
  "Kiki Kiss Beauty salon predstavlja krunu trogodišnjeg uspešnog rada i posvećenosti Kristine, čija je strast prema lepoti oblikovana kroz vrhunsku edukaciju i praksu. Osnovu našeg rada čine prestižni sertifikati sa zvaničnih kurseva za šminkanje i negu noktiju, koji garantuju stručnost u svakom pokretu. Svaki tretman u salonu osmišljen je tako da naglasi vašu prirodnu lepotu, koristeći samo najkvalitetnije materijale i tehnike koje su se dokazale kroz stotine zadovoljnih klijentkinja.",
  "Konstantno usavršavanje je srž našeg poslovanja, o čemu svedoči aktivno učešće na najvećim sajmovima kozmetike i prestižnim svetskim konferencijama. Kristina redovno uči od globalno poznatih šminkera, donoseći svetske trendove i inovativne metode direktno u naš salon. Spoj bogatog iskustva, edukacije kod najboljih stručnjaka i neprestane želje za napretkom čini Kiki Kiss Beauty mestom gde se vrhunska estetika susreće sa profesionalnom uslugom po najvišim standardima.",
];

interface Props {
  about: {
    headline?: string;
    paragraphs?: string[];
    image?: {
      src: string;
      alt: string;
    };
    links?: AboutTextLink[];
  };
}

export function Theme1AboutUs({ about }: Props) {
  const paragraphs =
    about.paragraphs && about.paragraphs.filter(Boolean).length > 0
      ? about.paragraphs
      : DEFAULT_PARAGRAPHS;

  return (
    <section className="relative isolate overflow-hidden bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,var(--color-indigo-100),white)] opacity-20" />
      <div className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] bg-white shadow-xl ring-1 shadow-indigo-600/10 ring-indigo-50 sm:mr-28 lg:mr-0 xl:mr-16 xl:origin-center" />
      <div className="mx-auto grid grid-cols-1 gap-8 lg:grid-cols-5 max-w-7xl">
        <div className="mx-auto lg:col-span-2 text-center">
          {about.image?.src ? (
            <Image
              src={about.image?.src || ""}
              alt={about.image?.alt || "O nama"}
              width={500}
              height={500}
              className="rounded-lg h-130 object-cover object-top"
            />
          ) : (
            <h2 className="text-4xl lg:text-6xl text-left font-semibold tracking-tight text-balance text-gray-900 sm:text-6xl">
              {about.headline || "O nama"}
            </h2>
          )}
        </div>
        <div className="my-auto space-y-8 lg:col-span-3">
          {about.image?.src && (
            <h2 className="text-4xl lg:text-6xl text-left font-semibold tracking-tight text-balance text-gray-900 sm:text-6xl">
              {about.headline || "O nama"}
            </h2>
          )}

          <blockquote className="relative flex flex-col gap-6 items-center text-center text-sm lg:text-md font-medium text-gray-900">
            {paragraphs[0] && (
              <p className="text-2xl lg:text-3xl font-semibold text-left">
                {renderLinkedText(paragraphs[0], about.links)}
              </p>
            )}
            <div className="flex flex-col lg:flex-row gap-6">
              {paragraphs.length > 1 && (
                <p className="text-justify flex-1">
                  {renderLinkedText(paragraphs[1], about.links)}
                </p>
              )}
              {paragraphs.length > 2 && (
                <p className="text-justify flex-1">
                  {renderLinkedText(paragraphs[2], about.links)}
                </p>
              )}
            </div>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
