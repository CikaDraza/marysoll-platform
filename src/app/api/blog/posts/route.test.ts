import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn() }));
vi.mock("@/lib/auth/auth-server", () => ({ requireTenantAdmin: vi.fn() }));
vi.mock("@/lib/platform/capabilities-server", () => ({ requireCapability: vi.fn() }));
vi.mock("@/models/NewsletterCampaign", () => ({ NewsletterCampaign: { find: vi.fn(), create: vi.fn(), findOne: vi.fn(), exists: vi.fn() } }));
import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { validateContentDocument } from "@/lib/content/validation/contentBlockValidation";
import { GET, POST } from "./route";
import { PATCH } from "./[id]/route";
import { POST as publish } from "./[id]/publish/route";
const tenantId = "6650a1f1a1f1a1f1a1f1a1f1";
const id = "6650a1f1a1f1a1f1a1f1a1f2";
const context = { params: Promise.resolve({ id }) };
const draft = { title: "Blog naslov", slug: "blog-naslov", description: "Opis", cover: "", blocks: [{ id: "a", type: "ArticleBlock", priority: 1, title: "Uvod", paragraphs: ["Sadržaj bloga"] }] };
const request = (body?: unknown) => new Request("https://admin.test/api/blog/posts", { method: body ? "POST" : "GET", ...(body ? {body: JSON.stringify(body)} : {}) });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireTenantAdmin).mockResolvedValue({success: true, tenantId});
  vi.mocked(requireCapability).mockResolvedValue(null);
  vi.mocked(NewsletterCampaign.create).mockImplementation(async input => ({_id: id, ...input, updatedAt: new Date()}) as never);
});
describe("separate blog authoring adapter", () => {
  it("gates capability before reading posts", async () => {
    vi.mocked(requireCapability).mockResolvedValue(NextResponse.json({}, {status: 403}));
    expect((await GET(request())).status).toBe(403);
    expect(NewsletterCampaign.find).not.toHaveBeenCalled();
  });
  it("ignores tenant and publication overrides in create", async () => {
    expect((await POST(request({...draft, tenantId: "other", landingPage: {status: "published"}}))).status).toBe(201);
    expect(NewsletterCampaign.create).toHaveBeenCalledWith(expect.objectContaining({tenantId, contentPurpose: "blog", landingPage: {enabled: false, status: "pending"}}));
  });
  it("rejects unsafe media and malformed blocks", async () => {
    expect((await POST(request({...draft, cover: "javascript:alert(1)"}))).status).toBe(400);
    expect((await POST(request({...draft, blocks: [{type: "untrusted"}]}))).status).toBe(422);
    expect(NewsletterCampaign.create).not.toHaveBeenCalled();
  });
  it("saves only the draft while published fields stay unchanged", async () => {
    const campaign = {_id: id, blogDraft: draft, set: vi.fn(), save: vi.fn(), landingPage: {status: "published"}, updatedAt: new Date()};
    vi.mocked(NewsletterCampaign.findOne).mockReturnValue({select: async () => campaign} as never);
    expect((await PATCH(request({...draft, title: "Nova verzija"}), context)).status).toBe(200);
    expect(NewsletterCampaign.findOne).toHaveBeenCalledWith({tenantId, contentPurpose: "blog", _id: id});
    expect(campaign.set).toHaveBeenCalledTimes(1);
    expect(campaign.set).toHaveBeenCalledWith("blogDraft", expect.objectContaining({title: "Nova verzija"}));
  });
  it("cannot load another tenant's post or newsletter", async () => {
    vi.mocked(NewsletterCampaign.findOne).mockReturnValue({select: async () => null} as never);
    expect((await PATCH(request(draft), context)).status).toBe(404);
  });
  it("publishes saved composer blocks only after validation", async () => {
    const campaign = {_id: id, blogDraft: draft, set: vi.fn(), save: vi.fn(), updatedAt: new Date()};
    vi.mocked(NewsletterCampaign.findOne).mockReturnValue({select: async () => campaign} as never);
    vi.mocked(NewsletterCampaign.exists).mockResolvedValue(null);
    expect((await publish(request(), context)).status).toBe(200);
    expect(validateContentDocument(campaign.set.mock.calls[0][0].landingPage.layout, "publish").valid).toBe(true);
    expect(campaign.set).toHaveBeenCalledWith(expect.objectContaining({name: draft.title, landingPage: expect.objectContaining({status: "published", enabled: true, layout: expect.arrayContaining(draft.blocks)})}));
  });
  it("refuses incomplete publication and existing public URLs", async () => {
    const campaign = {_id: id, blogDraft: {...draft, blocks: []} as typeof draft, set: vi.fn(), save: vi.fn()};
    vi.mocked(NewsletterCampaign.findOne).mockReturnValue({select: async () => campaign} as never);
    expect((await publish(request(), context)).status).toBe(400);
    campaign.blogDraft = draft;
    vi.mocked(NewsletterCampaign.exists).mockResolvedValue({_id: id} as never);
    expect((await publish(request(), context)).status).toBe(409);
    expect(campaign.save).not.toHaveBeenCalled();
  });
});
