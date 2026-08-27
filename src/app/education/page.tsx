import Link from "next/link";

const sections = [
  {
    href: "/education/offerings",
    title: "Ponude",
    description: "Struktura za edukativne ponude dolazi u Fazi 4B.",
  },
  {
    href: "/education/inquiries",
    title: "Upiti",
    description: "Obrada interesovanja i upita dolazi u Fazi 4B.",
  },
] as const;

export default function EducationWorkspacePage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-violet-500">
          Edu Centar
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          Education workspace
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Faza 0 postavlja workspace granicu. Sadržaj, programi i analitika nisu
          deo ove faze.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {section.title}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
