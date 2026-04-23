import type { LandingTheme } from "@/types";

/**
 * "images-only"           — gallery stores a flat array of images (no category/title/desc).
 *                           Used by masonry-style galleries (Theme 3/4/5).
 * "images-with-category"  — gallery stores treatments: each item has category, title, description, images.
 *                           Used by zigzag-style galleries (Theme 1/2).
 */
export type GalleryVariant = "images-only" | "images-with-category";

export interface ThemeSectionConfig {
  hero: {
    /** Whether this theme's hero accepts a user-uploaded image. */
    hasImage: boolean;
    /**
     * Maximum number of hero images:
     *   0 — no image (theme-1: image is baked into design)
     *   1 — single image
     *   4 — 2×2 image grid (theme-3 grid-right variant)
     */
    maxImages: number;
  };
  gallery: {
    variant: GalleryVariant;
  };
}

export const THEME_CONFIG: Record<LandingTheme, ThemeSectionConfig> = {
  /** Theme-1 "White Luxury" — hero is pure text, gallery is zigzag treatments. */
  "theme-1": {
    hero: { hasImage: false, maxImages: 0 },
    gallery: { variant: "images-with-category" },
  },
  /** Theme-2 "Dark Gold" — hero has one background image, gallery is treatment grid. */
  "theme-2": {
    hero: { hasImage: true, maxImages: 1 },
    gallery: { variant: "images-with-category" },
  },
  /** Theme-3 "Soft Beauty" — hero supports up to 4 grid images, gallery is masonry. */
  "theme-3": {
    hero: { hasImage: true, maxImages: 4 },
    gallery: { variant: "images-only" },
  },
  /** Theme-4 "Modern Spa" — hero has one image, gallery is masonry. */
  "theme-4": {
    hero: { hasImage: true, maxImages: 1 },
    gallery: { variant: "images-only" },
  },
  /** Theme-5 "Modern Portfolio" — hero has one image, gallery is masonry. */
  "theme-5": {
    hero: { hasImage: true, maxImages: 1 },
    gallery: { variant: "images-only" },
  },
};
