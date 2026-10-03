import { NextResponse } from "next/server";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { blogAuthority, blogFailure, blogFilter, blogRecord, parseBlog } from "@/lib/blog/server";

export async function GET(request: Request) {
  try {
    const auth = await blogAuthority(request);
    if (!auth.ok) return auth.response;
    const items = await NewsletterCampaign.find(blogFilter(auth.tenantId)).select("+blogDraft").sort({ updatedAt: -1 });
    return NextResponse.json({ items: items.map(blogRecord) });
  } catch (error) { return blogFailure(error); }
}
export async function POST(request: Request) {
  try {
    const auth = await blogAuthority(request);
    if (!auth.ok) return auth.response;
    const parsed = parseBlog(await request.json());
    if (!parsed.ok) return parsed.response;
    const campaign = await NewsletterCampaign.create({ tenantId: auth.tenantId, scope: "tenant",
      contentPurpose: "blog", campaignType: "email-landing", name: parsed.draft.title,
      subject: parsed.draft.title, content: "Blog", blogDraft: parsed.draft,
      landingPage: { enabled: false, status: "pending" } });
    return NextResponse.json({ item: blogRecord(campaign) }, { status: 201 });
  } catch (error) { return blogFailure(error); }
}
