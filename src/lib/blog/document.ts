import { z } from "zod";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import { resolveEducationSlug } from "@/lib/education/content-document";

export const blogDraftSchema = z.object({
  title: z.string().trim().min(1, "Unesite naslov").max(240),
  slug: z.string().max(240).default(""),
  description: z.string().max(2000).default(""),
  cover: z.string().max(2000).default(""),
  blocks: z.array(z.unknown()).max(100),
});
export interface BlogDraft {
  title: string;
  slug: string;
  description: string;
  cover: string;
  blocks: ContentBlock[];
}
export interface BlogPost {
  id: string;
  draft: BlogDraft;
  published: boolean;
  savedAt: string;
}
export function blogSlug(draft: Pick<BlogDraft, "title" | "slug">) {
  return resolveEducationSlug({ requestedSlug: draft.slug, title: draft.title });
}
/** Root fields remain the published version while blogDraft is edited. */
export function blogPublication(draft: BlogDraft) {
  return {
    name: draft.title,
    ctaSlug: `/blog/${draft.slug}`,
    landingPage: {
      enabled: true, slug: draft.slug, status: "published", layout: [
        ...(!draft.blocks.some(block => block.type === "HeroBlock" && block.visibility !== "hidden") ? [{ id: "blog-header", type: "HeroBlock", priority: 1, title: draft.title, subtitle: draft.description }] : []),
        ...draft.blocks,
      ],
      semanticType: "blog", audience: "client", editorialCategory: "Beauty",
      generatedAt: new Date(),
      seo: { title: draft.title, description: draft.description, ogTitle: draft.title,
        ogDescription: draft.description, ogImage: draft.cover },
    },
  };
}
