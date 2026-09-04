import Link from "next/link";
import {
  ArrowUpTrayIcon,
  PencilSquareIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import type { EducationStartMode } from "@/lib/education/authoringStart";

const CREATION_ACTIONS: ReadonlyArray<{
  mode: EducationStartMode;
  title: string;
  description: string;
  icon: typeof PencilSquareIcon;
}> = [
  {
    mode: "article",
    title: "Napiši članak",
    description: "Napišite stručni tekst od početka i uredite ga po sekcijama.",
    icon: PencilSquareIcon,
  },
  {
    mode: "import",
    title: "Uvezi dokument",
    description:
      "Pretvorite pripremljeni PDF ili DOCX u nacrt koji možete da uredite pre objave.",
    icon: ArrowUpTrayIcon,
  },
  {
    mode: "video",
    title: "Dodaj video",
    description:
      "Video je glavni sadržaj, uz naslov, opis i opciona dodatna objašnjenja.",
    icon: VideoCameraIcon,
  },
];

export function EducationCreationChooser({
  heading = "Kako želite da počnete?",
}: {
  heading?: string;
}) {
  return (
    <section aria-labelledby="education-creation-heading">
      <h2
        id="education-creation-heading"
        className="text-base font-semibold text-gray-900 dark:text-white"
      >
        {heading}
      </h2>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {CREATION_ACTIONS.map(({ mode, title, description, icon: Icon }) => (
          <Link
            key={mode}
            href={`/education/content/new?start=${mode}`}
            className="group min-h-40 rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-violet-400 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-violet-600"
          >
            <Icon
              aria-hidden="true"
              className="size-7 text-violet-600 dark:text-violet-400"
            />
            <h3 className="mt-5 font-bold text-gray-900 group-hover:text-violet-700 dark:text-white dark:group-hover:text-violet-300">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
