"use client";

import Link from "next/link";
import { useEducationContentRecord } from "@/hooks/education/useEducationContent";
import EducationContentEditor from "./EducationContentEditor";

export default function EducationContentEditorLoader({ id }: { id: string }) {
  const { data, isLoading, isError } = useEducationContentRecord(id);

  if (isLoading) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Učitavanje sadržaja…
      </p>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/education/content"
          className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
        >
          ← Sadržaj
        </Link>
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Ovaj sadržaj nije pronađen.
        </p>
      </div>
    );
  }

  // Ključ resetuje editor state kada se otvori drugi zapis.
  return <EducationContentEditor key={data.id} record={data} />;
}
