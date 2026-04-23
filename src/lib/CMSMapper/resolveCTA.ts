export function resolveCTA(cta: { text?: string; href?: string } | undefined, profile: { slug?: string }) {
  if (cta?.text && cta?.href) return cta;

  return {
    text: "Book Now",
    href: `/termini/${profile.slug || ""}`,
  };
}
