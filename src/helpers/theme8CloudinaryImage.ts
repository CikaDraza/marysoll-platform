import type { ImageLoaderProps } from "next/image";

const CLOUDINARY_IMAGE = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

/** Theme-8 CMS photos use Cloudinary's own responsive delivery when possible. */
export function isTheme8CloudinaryImage(src: string): boolean {
  return CLOUDINARY_IMAGE.test(src);
}

export function theme8CloudinaryLoader({ src, width }: ImageLoaderProps): string {
  if (!isTheme8CloudinaryImage(src)) return src;
  const url = new URL(src);
  const marker = "/image/upload/";
  const markerEnd = url.pathname.indexOf(marker) + marker.length;
  const suffix = url.pathname.slice(markerEnd);
  const version = suffix.match(/(?:^|\/)v\d+\//);
  const insertAt = version ? (version.index ?? 0) + (version[0].startsWith("/") ? 1 : 0) : 0;
  const transform = `c_limit,w_${width},q_auto,f_auto/`;
  url.pathname = `${url.pathname.slice(0, markerEnd)}${suffix.slice(0, insertAt)}${transform}${suffix.slice(insertAt)}`;
  return url.toString();
}

/** Local assets keep Next's optimizer; only CMS Cloudinary URLs use this loader. */
export function theme8ImageLoaderFor(src: string) {
  return isTheme8CloudinaryImage(src) ? theme8CloudinaryLoader : undefined;
}
