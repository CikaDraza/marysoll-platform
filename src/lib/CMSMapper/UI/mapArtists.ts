import { LandingStructure } from "@/types";

/** Ulaz na nivou sekcije (vidi `mapHeroSection`). */
export function mapArtistsSection(
  artists: LandingStructure["landing"]["artists"] | undefined,
) {
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

export function mapArtists(ls: LandingStructure | undefined) {
  return mapArtistsSection(ls?.landing?.artists);
}
