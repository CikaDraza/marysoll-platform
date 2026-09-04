import Image from "next/image";
import { focalObjectPosition } from "@/lib/content/render/imageFraming";
import { ArticleBlock as ArticleBlockType } from "@/lib/content/schemas/landing-blocks";

interface ArticleBlockProps {
  block: ArticleBlockType;
}

export default function ArticleBlock({ block }: ArticleBlockProps) {
  const { id, title, paragraphs, items, image } = block;

  return (
    <article
      id={id}
      className="relative isolate overflow-hidden px-6 text-left py-14 text-gray-950 dark:bg-gray-950 dark:text-white lg:px-8"
    >
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <svg
          aria-hidden="true"
          className="absolute top-0 left-[max(50%,25rem)] h-256 w-512 -translate-x-1/2 mask-[radial-gradient(64rem_64rem_at_top,white,transparent)] stroke-gray-200"
        >
          <defs>
            <pattern
              x="50%"
              y={-1}
              id="e813992c-7d03-4cc4-a2bd-151760b470a0"
              width={200}
              height={200}
              patternUnits="userSpaceOnUse"
            >
              <path d="M100 200V.5M.5 .5H200" fill="none" />
            </pattern>
          </defs>
          <svg x="50%" y={-1} className="overflow-visible fill-gray-50">
            <path
              d="M-100.5 0h201v201h-201Z M699.5 0h201v201h-201Z M499.5 400h201v201h-201Z M-300.5 600h201v201h-201Z"
              strokeWidth={0}
            />
          </svg>
          <rect
            fill="url(#e813992c-7d03-4cc4-a2bd-151760b470a0)"
            width="100%"
            height="100%"
            strokeWidth={0}
          />
        </svg>
      </div>
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h2>

        <div className="mt-6 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {items && items.length > 0 && (
          <ul className="mt-6 list-disc space-y-2 pl-6 text-base leading-8 text-gray-700 dark:text-gray-300">
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}

        {image && (
          <figure className="mt-10">
            <Image
              src={image.src}
              alt={image.alt}
              className="aspect-[16/9] w-full rounded-3xl object-cover shadow-md"
              style={{ objectPosition: focalObjectPosition(image.focalPoint) }}
              width={1200}
              height={800}
              loading="lazy"
            />
          </figure>
        )}
      </div>
    </article>
  );
}
