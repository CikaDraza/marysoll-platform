import Link from "next/link";

export default function NewEducationContentPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/education/content"
        className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
      >
        ← Sadržaj
      </Link>

      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-violet-500">
          Edu Centar
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          Novi sadržaj
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Editor povezujemo u sledećem koraku.
        </p>
      </header>
    </div>
  );
}
