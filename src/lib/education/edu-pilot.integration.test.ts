import { readFile } from "node:fs/promises";
import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db/mongodb", () => ({connectToDB: async () => undefined}));
vi.mock("@/lib/auth/auth-server", () => ({requireTenantAdmin: vi.fn()}));
vi.mock("@/lib/platform/capabilities-server", () => ({requireCapability: async () => null, resolveTenantCapability: async () => ({enabled: true})}));
import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { EducationContent } from "@/models/EducationContent";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { POST as createEducation } from "@/app/api/education/content/route";
import { PATCH as saveEducation } from "@/app/api/education/content/[id]/route";
import { POST as publishEducation } from "@/app/api/education/content/[id]/publish/route";
import { POST as importDocument } from "@/app/api/education/import/route";
import { POST as createBlog } from "@/app/api/blog/posts/route";
import { PATCH as saveBlog } from "@/app/api/blog/posts/[id]/route";
import { POST as publishBlog } from "@/app/api/blog/posts/[id]/publish/route";
import { getCampaign } from "@/lib/server/getCampaign";
import { listPublicEducationContent } from "@/lib/education/publicContent";
import { publishedBlogFilter } from "@/lib/tenant/blogPosts";

const tenantId = new Types.ObjectId().toString();
const otherTenant = new Types.ObjectId().toString();
const context = (id: string) => ({params: Promise.resolve({id})});
const request = (body?: unknown) => new Request("https://admin.test/api", {method: "POST", body: JSON.stringify(body ?? {})});
const blocks = [{id: "pilot-text", type: "ArticleBlock", priority: 1, title: "Uvod", paragraphs: ["Tekst pilot članka."]}];
const article = {title: "Pilot članak", slug: "pilot-clanak", kind: "article", accessMode: "public", topicKey: "assessment", intentKey: "recognize", blocks};
let repl: MongoMemoryReplSet;
beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({replSet: {count: 1, storageEngine: "wiredTiger"}});
  await mongoose.connect(repl.getUri(), {dbName: "edu-pilot-acceptance-test"});
  await EducationContent.syncIndexes();
}, 60_000);
afterAll(async () => {await mongoose.disconnect(); await repl?.stop();});
beforeEach(async () => {
  await EducationContent.deleteMany({}); await NewsletterCampaign.deleteMany({});
  await mongoose.connection.db?.collection("tenants").updateOne({_id: new Types.ObjectId(tenantId)}, {$set: {educationTaxonomyPreset: "skincare"}}, {upsert: true});
  vi.mocked(requireTenantAdmin).mockResolvedValue({success: true, tenantId});
});

async function createdEducation(payload: unknown) {
  const response = await createEducation(request(payload));
  expect(response.status).toBe(201);
  const data = await response.json();
  return String(data.item._id);
}
describe("E5 automated pilot readiness (human acceptance remains separate)", () => {
  it("writes an article, imports Marina's PDF, publishes a video and a separate blog", async () => {
    const articleId = await createdEducation(article);
    expect((await publishEducation(request(), context(articleId))).status).toBe(200);

    const form = new FormData();
    form.append("file", new File([await readFile("docs/marina-pdf/estetika_lica.pdf")], "estetika_lica.pdf", {type: "application/pdf"}));
    const importedResponse = await importDocument(new Request("https://admin.test/api/education/import", {method: "POST", body: form}));
    expect(importedResponse.status).toBe(200);
    const imported = await importedResponse.json();
    expect(imported.draft.title).toBe("ESTETIKA LICA");
    expect(imported.draft.blocks.length).toBeGreaterThanOrEqual(13);
    const pdfId = await createdEducation({...article, ...imported.draft, slug: "pilot-pdf"});
    expect((await publishEducation(request(), context(pdfId))).status).toBe(200);

    const videoId = await createdEducation({...article, title: "Pilot video", slug: "pilot-video", kind: "video", blocks: [{id: "video", type: "VideoBlock", priority: 1, source: {provider: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}}]});
    expect((await publishEducation(request(), context(videoId))).status).toBe(200);

    const blogDraft = {title: "Pilot blog", slug: "pilot-blog", description: "Kratak opis", cover: "", blocks};
    const blogResponse = await createBlog(request(blogDraft));
    expect(blogResponse.status).toBe(201);
    const blogId = (await blogResponse.json()).item.id;
    // This catches missing schema fields which mocked model tests cannot catch.
    expect(await NewsletterCampaign.findOne({_id: blogId, tenantId, contentPurpose: "blog"})).not.toBeNull();
    expect(await NewsletterCampaign.findOne({...publishedBlogFilter(tenantId), _id: blogId})).toBeNull();
    expect((await publishBlog(request(), context(blogId))).status).toBe(200);
    const publicBlog = await getCampaign("/blog/pilot-blog", tenantId);
    expect(publicBlog.name).toBe("Pilot blog");
    expect(publicBlog).not.toHaveProperty("blogDraft");

    expect((await saveEducation(request({title: "Novi radni naslov"}), context(articleId))).status).toBe(200);
    expect((await saveBlog(request({...blogDraft, title: "Novi blog nacrt"}), context(blogId))).status).toBe(200);
    const afterEdit = await getCampaign("/blog/pilot-blog", tenantId);
    expect(afterEdit.name).toBe("Pilot blog");
    expect(afterEdit).not.toHaveProperty("blogDraft");
    const publicEducation = await listPublicEducationContent(tenantId);
    expect(publicEducation.map(item => item.title)).toContain("Pilot članak");
    expect(publicEducation.map(item => item.title)).not.toContain("Novi radni naslov");
    expect(publicEducation).toHaveLength(3);
    expect(await NewsletterCampaign.find({tenantId, contentPurpose: {$ne: "blog"}})).toHaveLength(0);
    expect(await NewsletterCampaign.find(publishedBlogFilter(otherTenant))).toHaveLength(0);
    vi.mocked(requireTenantAdmin).mockResolvedValue({success: true, tenantId: otherTenant});
    expect((await saveBlog(request(blogDraft), context(blogId))).status).toBe(404);
  }, 60_000);
});
