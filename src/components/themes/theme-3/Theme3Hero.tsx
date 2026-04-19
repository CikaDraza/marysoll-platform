"use client";

import type { HeroImage } from "@/types";
import { HeroCenterImage } from "./HeroCenterImage";
import { HeroSplitLeft } from "./HeroSplitLeft";
import { HeroGridRight } from "./HeroGridRight";

export type HeroVariant = "center-image" | "split-left-image" | "grid-right-images";
export type { HeroImage };

export interface HeroCmsData {
  enabled?: boolean;
  variant?: string;
  headline?: string;
  subheadline?: string;
  whereWhatForWhom?: string;
  image?: HeroImage;
  images?: HeroImage[];
  contact?: {
    location?: string;
    phone?: string;
  };
}

export interface HeroCtaData {
  primary: { text: string; href: string };
  secondary?: { text: string; href: string };
}

export interface HeroSharedProps {
  data?: HeroCmsData;
  cta: HeroCtaData;
  tenantSlug?: string;
}

interface Theme3HeroProps extends HeroSharedProps {
  variant?: string;
}

export function Theme3Hero({ variant, data, cta, tenantSlug }: Theme3HeroProps) {
  const resolved = (variant ?? data?.variant ?? "center-image") as HeroVariant;
  const props: HeroSharedProps = { data, cta, tenantSlug };

  if (resolved === "split-left-image") return <HeroSplitLeft {...props} />;
  if (resolved === "grid-right-images") return <HeroGridRight {...props} />;
  return <HeroCenterImage {...props} />;
}
