import { LandingStructure } from "@/types";

export function mapArtists(ls: LandingStructure | undefined) {
  const artists = ls?.landing?.artists;

  return {
    headline: artists?.headline ?? "Our Artists",
    members:
      artists?.members.map((m) => ({
        name: m.name,
        role: m.role,
        bio: m.bio,
        image: {
          src: m.image.src,
          alt: m.image.alt,
        },
      })) ?? [],
    enabled: artists !== undefined ? artists.enabled : true,
  };
}
