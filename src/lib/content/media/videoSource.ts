import type { VideoSource } from "@/lib/content/schemas/landing-blocks";

export type ResolvedVideoSource =
  | { kind: "embed"; src: string }
  | { kind: "file"; src: string }
  | { kind: "unavailable"; href?: string };

export function resolveVideoSource(source?: VideoSource): ResolvedVideoSource {
  if (!source || typeof source !== "object") return { kind: "unavailable" };
  if (source.provider === "upload") {
    return source.media && typeof source.media.src === "string" && source.media.src && !/^(blob:|data:)/i.test(source.media.src)
      ? { kind: "file", src: source.media.src }
      : { kind: "unavailable" };
  }

  if ((source.provider !== "youtube" && source.provider !== "vimeo") || typeof source.url !== "string") {
    return { kind: "unavailable" };
  }

  try {
    const url = new URL(source.url);
    if (!["http:", "https:"].includes(url.protocol)) return { kind: "unavailable" };
    const host = url.hostname.replace(/^www\./, "");
    if (source.provider === "youtube") {
      const id = host === "youtu.be" ? url.pathname.split("/")[1] : url.searchParams.get("v") ?? url.pathname.match(/^\/embed\/([^/]+)/)?.[1];
      return id && ["youtube.com", "m.youtube.com", "youtu.be"].includes(host)
        ? { kind: "embed", src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` }
        : { kind: "unavailable", href: source.url };
    }
    const id = url.pathname.match(/^\/(?:video\/)?(\d+)/)?.[1];
    return id && (host === "vimeo.com" || host.endsWith(".vimeo.com"))
      ? { kind: "embed", src: `https://player.vimeo.com/video/${id}` }
      : { kind: "unavailable", href: source.url };
  } catch {
    return { kind: "unavailable" };
  }
}
