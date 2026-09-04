import EducationContentEditorLoader from "@/components/education/EducationContentEditorLoader";

export default async function EditEducationContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EducationContentEditorLoader id={id} />;
}
