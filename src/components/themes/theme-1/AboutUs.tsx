interface Props {
  about: {
    headline?: string;
    subheadline?: string;
  };
}

export function Theme1AboutUs({ about }: Props) {
  return (
    <section className="relative isolate overflow-hidden bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,var(--color-indigo-100),white)] opacity-20" />
      <div className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] bg-white shadow-xl ring-1 shadow-indigo-600/10 ring-indigo-50 sm:mr-28 lg:mr-0 xl:mr-16 xl:origin-center" />
      <div className="mx-auto max-w-2xl lg:max-w-4xl">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mt-2 text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-6xl">
            O nama
          </h2>
          <p className="mx-auto max-w-2xl text-center text-sm font-medium text-pretty text-gray-600">
            zvuk u svom najčistijem stanju
          </p>
        </div>
        <div className="mt-10">
          <blockquote className="relative flex items-center text-center text-sm lg:text-base font-medium text-gray-900">
            <p className="text-center lg:text-right">
              “Lorem ipsum dolor sit amet consectetur adipisicing elit. Nemo
              expedita voluptas culpa sapiente alias molestiae. Numquam corrupti
              in laborum sed rerum et corporis.”
            </p>
            <div // ── Separator ───────────────────────────────────────────────
              className="hidden lg:block absolute left-1/2 top-0 -translate-x-1/2 h-full w-px bg-gray-700"
              aria-hidden="true"
            />
            <p className="text-center lg:text-left ml-0 lg:ml-10">
              “Lorem ipsum dolor sit amet consectetur adipisicing elit. Nemo
              expedita voluptas culpa sapiente alias molestiae. Numquam corrupti
              in laborum sed rerum et corporis.”
            </p>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
