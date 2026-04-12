const DEFAULT_PARAGRAPHS = [
  "Kiki Kiss Beauty salon predstavlja krunu trogodišnjeg uspešnog rada i posvećenosti Kristine, čija je strast prema lepoti oblikovana kroz vrhunsku edukaciju i praksu. Osnovu našeg rada čine prestižni sertifikati sa zvaničnih kurseva za šminkanje i negu noktiju, koji garantuju stručnost u svakom pokretu. Svaki tretman u salonu osmišljen je tako da naglasi vašu prirodnu lepotu, koristeći samo najkvalitetnije materijale i tehnike koje su se dokazale kroz stotine zadovoljnih klijentkinja.",
  "Konstantno usavršavanje je srž našeg poslovanja, o čemu svedoči aktivno učešće na najvećim sajmovima kozmetike i prestižnim svetskim konferencijama. Kristina redovno uči od globalno poznatih šminkera, donoseći svetske trendove i inovativne metode direktno u naš salon. Spoj bogatog iskustva, edukacije kod najboljih stručnjaka i neprestane želje za napretkom čini Kiki Kiss Beauty mestom gde se vrhunska estetika susreće sa profesionalnom uslugom po najvišim standardima.",
];

interface Props {
  about: {
    headline?: string;
    paragraphs?: string[];
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
      <div className="mx-auto max-w-2xl lg:max-w-4xl">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mt-2 text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-6xl">
            {about.headline || "O nama"}
          </h2>
        </div>
        <div className="mt-16 lg:mt-24">
          <blockquote className="relative flex flex-col lg:flex-row gap-6 items-center text-center text-sm lg:text-md font-medium text-gray-900">
            {paragraphs[0] && (
              <p className="text-justify lg:text-right">{paragraphs[0]}</p>
            )}
            {paragraphs.length > 1 && (
              <>
                <div
                  className="hidden lg:block h-26 w-1 bg-gray-700"
                  aria-hidden="true"
                />
                <p className="text-justify lg:text-left">{paragraphs[1]}</p>
              </>
            )}
          </blockquote>
        </div>
      </div>
    </section>
  );
}
