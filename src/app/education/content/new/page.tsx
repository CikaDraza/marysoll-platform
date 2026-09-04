import EducationContentEditor from "@/components/education/EducationContentEditor";
import { EducationCreationChooser } from "@/components/education/EducationCreationChooser";
import { resolveEducationStartMode } from "@/lib/education/authoringStart";

export default async function NewEducationContentPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string | string[] }>;
}) {
  const startMode = resolveEducationStartMode((await searchParams).start);

  if (!startMode) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Novi sadržaj
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Izaberite početak koji odgovara sadržaju koji već imate.
          </p>
        </header>
        <EducationCreationChooser />
      </div>
    );
  }

  return <EducationContentEditor startMode={startMode} />;
}
