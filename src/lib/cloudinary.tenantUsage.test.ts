import { beforeEach, describe, expect, it, vi } from "vitest";

const { expression, pages } = vi.hoisted(() => ({
  expression: vi.fn(),
  pages: vi.fn(),
}));
vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn() }));
vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    search: { expression },
  },
}));

import {
  getTenantCloudinaryUsage,
  tenantFolderSearchExpression,
} from "./cloudinary";

describe("tenant dynamic-folder Cloudinary usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    expression.mockImplementation(() => {
      let cursor: string | undefined;
      const request = {
        max_results: vi.fn(() => request),
        next_cursor: vi.fn((value: string) => {
          cursor = value;
          return request;
        }),
        execute: vi.fn(() => pages(cursor)),
      };
      return request;
    });
  });

  it("uses asset_folder, not public_id, and counts exact and nested image/video/raw pages", async () => {
    pages.mockImplementation(async (cursor?: string) =>
      cursor
        ? {
            resources: [
              {
                public_id: "unrelated-video-id",
                resource_type: "video",
                bytes: 20,
              },
              { public_id: "document", resource_type: "raw", bytes: 30 },
            ],
          }
        : {
            resources: [
              {
                public_id: "unrelated-image-id",
                resource_type: "image",
                bytes: 10,
              },
            ],
            next_cursor: "page-2",
          },
    );
    const result = await getTenantCloudinaryUsage("salons/anja");
    expect(expression).toHaveBeenCalledWith(
      `${tenantFolderSearchExpression("salons/anja")} AND (resource_type:image OR resource_type:video OR resource_type:raw)`,
    );
    expect(expression.mock.calls[0][0]).toContain('asset_folder="salons/anja"');
    expect(expression.mock.calls[0][0]).toContain("asset_folder:salons/anja/*");
    expect(result).toEqual({
      totalBytes: 60,
      assets: 3,
      imageBytes: 10,
      videoBytes: 20,
      rawBytes: 30,
    });
    expect(pages).toHaveBeenCalledTimes(2);
    expect(pages).toHaveBeenLastCalledWith("page-2");
  });

  it("escapes reserved folder characters while keeping the subtree wildcard active", () => {
    const escape = String.fromCharCode(92);
    expect(tenantFolderSearchExpression(" salons/my folder ")).toBe(
      '(asset_folder="salons/my folder" OR asset_folder:salons/my' +
        escape +
        " folder/*)",
    );
  });

  it("rejects provider failures and malformed pages instead of reporting zero", async () => {
    pages.mockRejectedValueOnce(new Error("429"));
    await expect(getTenantCloudinaryUsage("salons/anja")).rejects.toThrow(
      "429",
    );
    pages.mockResolvedValueOnce({ resources: undefined });
    await expect(getTenantCloudinaryUsage("salons/anja")).rejects.toThrow(
      "listu assets",
    );
  });
});
