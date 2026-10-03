import { BlogCreationChooser, BlogEditor } from "@/components/blog/BlogWorkspace";
export default async function NewBlogPage({ searchParams }: { searchParams: Promise<{start?: string}> }) {
  const { start } = await searchParams;
  if (start !== "article" && start !== "import") return <BlogCreationChooser />;
  return <BlogEditor start={start} />;
}
