import "server-only";
import { connectToDB } from "@/lib/db/mongodb";
import { ProfilPlatforme } from "@/models/ProfilPlatforme";
import type { MarketingLandingStructure } from "@/types/marketing-landing";
import {
  DEFAULT_MARKETING_LANDING,
  normalizeMarketingLanding,
} from "@/lib/marketing-landing-defaults";

export async function getMarketingLanding(): Promise<MarketingLandingStructure> {
  try {
    await connectToDB();
    const profile = await ProfilPlatforme.findOne({}).select("marketingLanding").lean() as
      | { marketingLanding?: Record<string, unknown> }
      | null;

    if (
      profile?.marketingLanding &&
      Object.keys(profile.marketingLanding).length > 0
    ) {
      return normalizeMarketingLanding(
        profile.marketingLanding as unknown as Partial<MarketingLandingStructure>,
      );
    }
  } catch {
    // fallback to defaults on DB error
  }

  return DEFAULT_MARKETING_LANDING;
}
