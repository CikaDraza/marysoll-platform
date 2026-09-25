import { z } from "zod";

const webOrLocalUrl = z.string().trim().refine((value) => {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}, "Unesite ispravan link (https:// ili /putanja).");

const imageSchema = z.object({
  url: z.string(),
  publicId: z.string().optional(),
  alt: z.string(),
});

const bannerFieldsSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]+$/, "Neispravan ID banera."),
  name: z.string().optional(),
  enabled: z.boolean(),
  title: z.string().optional(),
  description: z.string().optional(),
  accentPhrase: z.string().optional(),
  image: imageSchema,
  containerStyle: z.enum(["contained", "full-width"]),
  backgroundImage: imageSchema.partial({ alt: true }).optional(),
  cta: z.object({
    enabled: z.boolean(),
    label: z.string().optional(),
    destination: z.discriminatedUnion("type", [
      z.object({ type: z.literal("custom"), url: z.string() }),
      z.object({ type: z.literal("edu-center") }),
      z.object({ type: z.literal("modal") }),
    ]),
  }).optional(),
  divider: z.object({ enabled: z.boolean(), url: z.string().optional() }).optional(),
});

type BannerFields = z.infer<typeof bannerFieldsSchema>;

type Issue = { path: (string | number)[]; message: string };

function enabledBannerIssues(banner: BannerFields): Issue[] {
  const issues: Issue[] = [];
  if (!banner.image.url.trim() || !webOrLocalUrl.safeParse(banner.image.url).success) {
    issues.push({ path: ["image", "url"], message: "Uključen banner mora imati sliku." });
  }
  if (!banner.image.alt.trim()) {
    issues.push({ path: ["image", "alt"], message: "Unesite opis slike." });
  }
  if (banner.containerStyle === "full-width" &&
      (!banner.backgroundImage?.url.trim() ||
        !webOrLocalUrl.safeParse(banner.backgroundImage.url).success)) {
    issues.push({ path: ["backgroundImage", "url"], message: "Banner preko cele širine mora imati pozadinsku sliku." });
  }
  return issues;
}

function optionalLinkIssues(banner: BannerFields): Issue[] {
  const issues: Issue[] = [];
  if (banner.cta?.enabled && banner.cta.destination.type === "custom" &&
      !webOrLocalUrl.safeParse(banner.cta.destination.url).success) {
    issues.push({ path: ["cta", "destination", "url"], message: "Unesite link za CTA." });
  }
  if (banner.divider?.enabled && banner.divider.url &&
      !webOrLocalUrl.safeParse(banner.divider.url).success) {
    issues.push({ path: ["divider", "url"], message: "Unesite ispravan divider URL." });
  }
  return issues;
}

export const marketingBannerSchema = bannerFieldsSchema.superRefine((banner, ctx) => {
  if (!banner.enabled) return;
  for (const issue of [...enabledBannerIssues(banner), ...optionalLinkIssues(banner)]) {
    ctx.addIssue({ code: "custom", ...issue });
  }
});

export const marketingBannersSchema = z.array(marketingBannerSchema).max(30).superRefine((banners, ctx) => {
  const ids = banners.map((banner) => banner.id);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: "custom", message: "Baneri moraju imati jedinstvene ID-jeve." });
  }
});
