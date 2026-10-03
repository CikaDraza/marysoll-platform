import { BlogEditorLoader } from "@/components/blog/BlogWorkspace";
export default async function EditBlogPage({params}: {params: Promise<{id: string}>}) {
  return <BlogEditorLoader id={(await params).id} />;
}
