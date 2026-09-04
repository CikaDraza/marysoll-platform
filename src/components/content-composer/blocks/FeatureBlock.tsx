import Image from "next/image";
import { focalObjectPosition } from "@/lib/content/render/imageFraming";
import { FeatureBlock as FeatureBlockType } from "@/lib/content/schemas/landing-blocks";

interface FeatureBlockProps {
  block: FeatureBlockType;
}

export default function FeatureBlock({ block }: FeatureBlockProps) {
  const { id, title, intro, sections } = block;

  return (
    <section
      id={id}
      className="text-left px-6 py-16 text-gray-950 dark:bg-gray-900 dark:text-white lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <header>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h2>

          {intro && (
            <p className="mt-5 text-base leading-8 text-gray-700 dark:text-gray-300">
              {intro}
            </p>
          )}
        </header>

        <div className="mt-12 space-y-12">
          {sections.map((section, index) => (
            <article
              key={index}
              className="border-t border-gray-200 pt-8 dark:border-gray-700"
            >
              <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {section.title}
                  </h3>

                  <div className="mt-4 space-y-4 text-base leading-8 text-gray-700 dark:text-gray-300">
                    {section.paragraphs.map((paragraph, paragraphIndex) => (
                      <p key={paragraphIndex}>{paragraph}</p>
                    ))}
                  </div>

                  {section.items && section.items.length > 0 && (
                    <ul className="mt-5 list-disc space-y-2 pl-5 text-base leading-7 text-gray-700 dark:text-gray-300">
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {section.image && (
                  <Image
                    width={1200}
                    height={800}
                    src={section.image.src}
                    alt={section.image.alt}
                    className="aspect-[4/3] w-full rounded-2xl object-cover shadow-sm"
                    style={{ objectPosition: focalObjectPosition(section.image.focalPoint) }}
                    loading="lazy"
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
