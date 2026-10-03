import "server-only";
import { NextResponse } from "next/server";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { connectToDB } from "@/lib/db/mongodb";
import { requireEducationContentAuthority, isValidObjectId, invalidIdResponse, notFoundResponse, metadataFailureResponse } from "@/lib/education/content-authority";
import { validateContentDocument } from "@/lib/content/validation/contentBlockValidation";
import { contentValidationFailureResponse } from "@/lib/content/validation/contentValidationResponse";
import { blogDraftSchema, blogSlug, type BlogDraft } from "./document";

export function blogFilter(tenantId: string, id?: string) {
  return { tenantId, contentPurpose: "blog", ...(id ? { _id: id } : {}) };
}
// Mongoose's existing campaign model is untyped; keep adapter output explicit.
export function blogRecord(campaign: { _id: unknown; blogDraft: BlogDraft; updatedAt: Date; landingPage?: {status?: string} }) {
  return { id: String(campaign._id), draft: campaign.blogDraft,
    published: campaign.landingPage?.status === "published", savedAt: campaign.updatedAt };
}
export async function blogAuthority(request: Request, id?: string) {
  const auth = await requireEducationContentAuthority(request);
  if (!auth.ok) return auth;
  if (id && !isValidObjectId(id)) return { ok: false as const, response: invalidIdResponse() };
  await connectToDB();
  return auth;
}
export async function getBlog(request: Request, id: string) {
  const auth = await blogAuthority(request, id);
  if (!auth.ok) return auth;
  const campaign = await NewsletterCampaign.findOne(blogFilter(auth.tenantId, id)).select("+blogDraft");
  if (!campaign) return { ok: false as const, response: notFoundResponse() };
  return { ok: true as const, campaign, tenantId: auth.tenantId };
}
export function parseBlog(body: unknown) {
  const parsed = blogDraftSchema.safeParse(body);
  if (!parsed.success) return { ok: false as const, response: metadataFailureResponse(parsed.error.issues[0]?.message ?? "Neispravan blog") };
  const validation = validateContentDocument(parsed.data.blocks, "draft");
  if (!validation.valid) return { ok: false as const, response: contentValidationFailureResponse(validation) };
  const slug = blogSlug(parsed.data as BlogDraft);
  if (!slug) return { ok: false as const, response: metadataFailureResponse("Unesite web adresu") };
  if (parsed.data.cover && !/^(https?:\/\/|\/(?!\/))/.test(parsed.data.cover))
    return { ok: false as const, response: metadataFailureResponse("Slika mora imati HTTP(S) ili relativnu adresu") };
  return { ok: true as const, draft: { ...parsed.data, slug } as BlogDraft };
}
export function blogFailure(error: unknown) {
  console.error("[Blog authoring]", error);
  return NextResponse.json({ error: "Blog nije moguće sačuvati" }, { status: 500 });
}
