import { NextResponse } from "next/server";
import { blogFailure, blogRecord, getBlog, parseBlog } from "@/lib/blog/server";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try { const result = await getBlog(request, (await context.params).id);
    return result.ok ? NextResponse.json({ item: blogRecord(result.campaign) }) : result.response;
  } catch (error) { return blogFailure(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const result = await getBlog(request, (await context.params).id);
    if (!result.ok) return result.response;
    const parsed = parseBlog(await request.json());
    if (!parsed.ok) return parsed.response;
    result.campaign.set("blogDraft", parsed.draft);
    await result.campaign.save();
    return NextResponse.json({ item: blogRecord(result.campaign) });
  } catch (error) { return blogFailure(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const result = await getBlog(request, (await context.params).id);
    if (!result.ok) return result.response;
    await result.campaign.deleteOne();
    return NextResponse.json({ deleted: true });
  } catch (error) { return blogFailure(error); }
}
