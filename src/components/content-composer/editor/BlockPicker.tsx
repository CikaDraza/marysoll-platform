import { landingBlockTypes, type LandingBlockType } from "@/lib/content/schemas/landing-blocks";

export const CONTENT_BLOCK_LABELS: Record<LandingBlockType, string> = {
  HeroBlock: "Hero",
  ArticleBlock: "Članak",
  FeatureBlock: "Karakteristike",
  ContentSplitBlock: "Sadržaj sa slikom",
  PricingBlock: "Cenovnik",
  AffiliateCTABlock: "CTA",
};

export function BlockPicker({ onPick }: { onPick: (type: LandingBlockType) => void }) {
  return (
    <div className="grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2 dark:border-gray-700 dark:bg-gray-900" aria-label="Izbor tipa bloka">
      {landingBlockTypes.map((type) => (
        <button
          key={type}
          type="button"
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-sm font-semibold hover:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-500"
          onClick={() => onPick(type)}
        >
          {CONTENT_BLOCK_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
