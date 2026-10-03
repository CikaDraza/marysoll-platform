import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({post: vi.fn(), options: [] as {mutationFn: (value: string) => Promise<unknown>}[]}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useQueryClient: () => ({invalidateQueries: vi.fn()}),
  useMutation: (options: {mutationFn: (value: string) => Promise<unknown>}) => {mocks.options.push(options); return options;},
}));
vi.mock("@/lib/api", () => ({api: {post: mocks.post}}));
import { useEducationContentMutations } from "./useEducationContent";

describe("first save followed immediately by publish", () => {
  it("publishes the newly saved ID even before the editor rerenders", async () => {
    mocks.options.length = 0;
    mocks.post.mockResolvedValue({data: {item: {_id: "just-created", title: "Članak", slug: "clanak", kind: "article", accessMode: "public", status: "published", blocks: []}}});
    function PublishHarness() { useEducationContentMutations(undefined); return null; }
    renderToStaticMarkup(createElement(PublishHarness));
    await mocks.options[2].mutationFn("just-created");
    expect(mocks.post).toHaveBeenCalledWith("/education/content/just-created/publish");
  });
});
