import { describe, expect, it } from "vitest";
import { isTheme8CloudinaryImage, theme8CloudinaryLoader } from "./theme8CloudinaryImage";

const SOURCE = "https://res.cloudinary.com/dufo1t5li/image/upload/v1782278069/salons/anja/gallery.jpg";

describe("Theme 8 Cloudinary image delivery", () => {
  it("asks Cloudinary for a width-limited automatic format instead of the original", () => {
    expect(theme8CloudinaryLoader({ src: SOURCE, width: 640 })).toBe(
      "https://res.cloudinary.com/dufo1t5li/image/upload/c_limit,w_640,q_auto,f_auto/v1782278069/salons/anja/gallery.jpg",
    );
  });

  it("retains existing transformations and query parameters", () => {
    expect(theme8CloudinaryLoader({
      src: "https://res.cloudinary.com/demo/image/upload/c_crop,g_auto/v123/photo.jpg?x=1",
      width: 384,
    })).toBe("https://res.cloudinary.com/demo/image/upload/c_crop,g_auto/c_limit,w_384,q_auto,f_auto/v123/photo.jpg?x=1");
  });

  it("leaves local and unrelated media on Next's existing path", () => {
    expect(isTheme8CloudinaryImage("/images/theme-8/lash-classic.webp")).toBe(false);
    expect(theme8CloudinaryLoader({ src: "/images/theme-8/lash-classic.webp", width: 640 })).toBe("/images/theme-8/lash-classic.webp");
  });
});
