export interface MarketingBanner {
  id: string;
  /** CMS label; when empty the title is used. */
  name?: string;
  enabled: boolean;
  title?: string;
  description?: string;
  /** Optional part of description highlighted in Y2K pink. */
  accentPhrase?: string;
  image: { url: string; publicId?: string; alt: string };
  /** Contained stacks image, title, copy and CTA; full-width splits desktop layout. */
  containerStyle: "contained" | "full-width";
  backgroundImage?: { url: string; publicId?: string; alt?: string };
  cta?: {
    enabled: boolean;
    label?: string;
    destination:
      | { type: "custom"; url: string }
      | { type: "edu-center" };
  };
  divider?: { enabled: boolean; url?: string };
}

export type Theme8SystemSectionId =
  | "hero"
  | "about"
  | "social-proof"
  | "services"
  | "gallery"
  | "perks"
  | "testimonials"
  | "faq"
  | "tribute";

/** Entries are system IDs or `marketing:${banner.id}`. */
export type Theme8SectionOrder = string[];
