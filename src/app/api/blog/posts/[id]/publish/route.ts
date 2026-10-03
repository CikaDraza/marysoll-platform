import { NextResponse } from "next/server";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { blogFailure, blogRecord, getBlog } from "@/lib/blog/server";
import { blogPublication, type BlogDraft } from "@/lib/blog/document";
import { validateContentDocument } from "@/lib/content/validation/contentBlockValidation";
import { contentValidationFailureResponse } from "@/lib/content/validation/contentValidationResponse";
import { slugTakenResponse } from "@/lib/education/content-authority";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const result = await getBlog(request, (await context.params).id);
    if (!result.ok) return result.response;
    const draft = result.campaign.blogDraft as BlogDraft;
    const validation = validateContentDocument(draft.blocks, "publish");
    if (!validation.valid) return contentValidationFailureResponse(validation);
    if (!validation.blocks.some(block => block.status === "VALID"))
      return NextResponse.json({ error: "Dodajte barem jedan potpun vidljiv blok" }, { status: 400 });
    const conflict = await NewsletterCampaign.exists({ tenantId: result.tenantId,
      _id: { $ne: result.campaign._id },
      "landingPage.slug": { $in: [draft.slug, `/${draft.slug}`, `/blog/${draft.slug}`] },
      "landingPage.status": "published" });
    if (conflict) return slugTakenResponse();
    result.campaign.set(blogPublication(draft));
    await result.campaign.save();
    return NextResponse.json({ item: blogRecord(result.campaign) });
  } catch (error) { return blogFailure(error); }
}
