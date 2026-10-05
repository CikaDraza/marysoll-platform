import { describe, expect, it } from "vitest";
import type { NewsletterVariable } from "@/types";
import { isMultilineNewsletterField } from "./fieldPresentation";

const field = (name: string, type: NewsletterVariable["type"] = "text"): NewsletterVariable => ({ name, label: name, type });

describe("Newsletter field presentation", () => {
  it("uses multiline fields for long content in older and imported templates", () => {
    for (const name of ["description", "productDescription", "og_description", "body", "summary", "heroText", "mainText", "imagePrompt", "opis", "message"]) {
      expect(isMultilineNewsletterField(field(name)), name).toBe(true);
    }
    expect(isMultilineNewsletterField(field("custom", "textarea"))).toBe(true);
  });

  it("keeps titles, names, subjects and short phrases single-line", () => {
    for (const name of ["title", "subtitle", "campaignName", "clientName", "subject", "previewText", "ctaText", "itemOne", "contentTitle"]) {
      expect(isMultilineNewsletterField(field(name)), name).toBe(false);
    }
  });

  it("preserves URL, image and date inputs even when their names mention content", () => {
    for (const type of ["url", "image", "date", "datetime-local"] as const) {
      expect(isMultilineNewsletterField(field("content", type))).toBe(false);
    }
  });
});
