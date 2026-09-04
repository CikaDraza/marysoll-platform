import Link from "next/link";

export default function EducationOfferingsPage() {
  return (
    <div className="space-y-4">
      <Link href="/education" className="text-sm text-violet-600 hover:underline">
        ← Edu Centar
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Edukativne ponude
      </h1>
      <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Workspace ruta je rezervisana u Fazi 0. Model i upravljanje ponudama
        dolaze u Fazi 4B.
      </p>
    </div>
  );
}
