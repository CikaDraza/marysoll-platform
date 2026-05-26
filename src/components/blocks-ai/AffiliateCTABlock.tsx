import Image from "next/image";
import { AffiliateCTABlock as AffiliateCTABlockType } from "@/types/landing-blocks";

interface AffiliateCTABlockProps {
  block: AffiliateCTABlockType;
}

export default function AffiliateCTABlock({ block }: AffiliateCTABlockProps) {
  const { id, eyebrow, title, description, ctaLabel, href, image } = block;

  return (
    <aside
      id={id}
      className="relative isolate overflow-hidden bg-gray-950 text-left px-6 py-16 text-white lg:px-8"
    >
      {image && (
        <Image
          width={800}
          height={400}
          alt={image.alt}
          src={image.src}
          className="absolute inset-0 -z-10 size-full object-cover object-right md:object-center"
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gray-950/75 backdrop-blur-[2px] md:bg-gradient-to-r md:from-gray-950/90 md:via-gray-950/70 md:to-gray-950/35"
      />
      <div
        aria-hidden="true"
        className="hidden sm:absolute sm:-top-10 sm:right-1/2 sm:-z-10 sm:mr-10 sm:block sm:transform-gpu sm:blur-3xl"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="aspect-1097/845 w-274.25 bg-linear-to-tr from-[#ff4694] to-[#776fff] opacity-20"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute -top-52 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl sm:-top-112 sm:ml-16 sm:translate-x-0"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="aspect-1097/845 w-274.25 bg-linear-to-tr from-[#ff4694] to-[#776fff] opacity-20"
        />
      </div>
      <div className="mx-auto grid max-w-full gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-300">
              {eyebrow}
            </p>
          )}

          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h2>

          {description && (
            <p className="mt-5 text-base leading-8 text-gray-300">
              {description}
            </p>
          )}

          <div className="mt-8">
            <a
              href={href}
              className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-200"
            >
              {ctaLabel}
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
