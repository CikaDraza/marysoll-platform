import Link from "next/link";

export default function EducationWorkspacePage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-violet-500">
          Edu Centar
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          Edu Centar
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Kreirajte i upravljajte stručnim sadržajem za svoje klijente i javnu
          edukaciju.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/education/content"
          className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Sadržaj
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Kreirajte i objavljujte stručne edukativne materijale.
          </p>
          <span className="mt-4 inline-flex text-sm font-semibold text-violet-600 dark:text-violet-400">
            Otvori sadržaj →
          </span>
        </Link>
      </div>
    </div>
  );
}
