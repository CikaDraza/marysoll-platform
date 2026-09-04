import Image from "next/image";
import { focalObjectPosition } from "@/lib/content/render/imageFraming";
import clsx from "clsx";
import { ContentSplitBlock as ContentSplitBlockType } from "@/lib/content/schemas/landing-blocks";

export function ContentSplitBlockView({
  block,
}: {
  block: ContentSplitBlockType;
}) {
  return (
    <section id={block.id} className="px-6 py-16 text-gray-950 lg:px-8">
      <div
        className={clsx(
          "mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center",
          block.reverse && "lg:[&>*:first-child]:order-2",
        )}
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {block.title}
          </h2>
          <p className="mt-5 text-base leading-8 text-gray-700">
            {block.content}
          </p>
        </div>

        {block.image && (
          <figure>
            <Image
              width={1200}
              height={800}
              src={block.image.src}
              alt={block.image.alt}
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-sm"
              style={{ objectPosition: focalObjectPosition(block.image.focalPoint) }}
              loading="lazy"
            />
          </figure>
        )}
      </div>
    </section>
  );
}
