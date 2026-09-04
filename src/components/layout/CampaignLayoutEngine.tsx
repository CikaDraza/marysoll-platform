import { BlockList } from "@/components/content-composer/BlockList";
import { LandingBlock } from "@/lib/content/schemas/landing-blocks";

interface Props {
  blocks: LandingBlock[];
}

export function CampaignLayoutEngine({ blocks }: Props) {
  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-x-hidden px-1 pb-0 2xl:px-16">
      <BlockList blocks={blocks} />
    </main>
  );
}
