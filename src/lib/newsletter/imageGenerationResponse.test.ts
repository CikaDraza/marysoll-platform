import { describe, expect, it } from "vitest";
import { getImageGenerationUrl } from "./imageGenerationResponse";

describe("getImageGenerationUrl", () => {
  it("returns a normalized URL string", () => {
    expect(
      getImageGenerationUrl({
        url: "  https://res.cloudinary.com/demo/image/upload/example.png  ",
      }),
    ).toBe("https://res.cloudinary.com/demo/image/upload/example.png");
  });

  it("rejects the old nested Cloudinary response shape", () => {
    expect(
      getImageGenerationUrl({
        url: { secure_url: "https://res.cloudinary.com/demo/image.png" },
      }),
    ).toBeNull();
  });

  it("rejects an empty URL", () => {
    expect(getImageGenerationUrl({ url: "  " })).toBeNull();
  });
});
