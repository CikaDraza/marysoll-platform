import Link from "next/link";

export default function EducationContentPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-violet-500">
          Edu Centar
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          Sadržaj
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Ovde ćete kreirati i objavljivati edukativne materijale.
        </p>
      </header>

      <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Još nema sadržaja
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
          Prvi edukativni materijal moći ćete da sastavite u Content Composer
          editoru.
        </p>
        <Link
          href="/education/content/new"
          className="mt-5 inline-flex items-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          + Novi sadržaj
        </Link>
      </section>
    </div>
  );
}
