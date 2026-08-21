import { describe, expect, it } from "vitest";
import {
  EMPTY_MAIN_IMAGE_PREVIEW_SRC,
  renderNewsletterPreviewHtml,
} from "./previewHtml";

describe("renderNewsletterPreviewHtml", () => {
  it("replaces an unfilled mainImage source only inside an image tag", () => {
    const html = '<img src="{{mainImage}}" alt="Glavna slika"><p>{{clientName}}</p>';

    expect(renderNewsletterPreviewHtml(html)).toBe(
      `<img src="${EMPTY_MAIN_IMAGE_PREVIEW_SRC}" alt="Glavna slika"><p>{{clientName}}</p>`,
    );
  });

  it("keeps a real image URL unchanged", () => {
    const html = '<img src="https://res.cloudinary.com/demo/image/upload/example.png">';

    expect(renderNewsletterPreviewHtml(html)).toBe(html);
  });
});
