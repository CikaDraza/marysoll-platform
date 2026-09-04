import Link from "next/link";
import { PricingBlock as PricingBlockType } from "@/lib/content/schemas/landing-blocks";

interface Props {
  block: PricingBlockType;
}

function formatPrice(price: NonNullable<PricingBlockType["items"][number]["price"]>) {
  return new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: price.currency,
    maximumFractionDigits: 0,
  }).format(price.amount);
}

export default function PricingBlockView({ block }: Props) {
  if (!block.items.length) return null;

  return (
    <section id={block.id} className="bg-white px-6 py-16 text-gray-950 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {block.title}
          </h2>
          {block.description && (
            <p className="mt-5 text-base leading-8 text-gray-700">
              {block.description}
            </p>
          )}
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {block.items.map((item) => (
            <article
              key={item.title}
              className="rounded-lg border border-gray-200 p-6 shadow-sm"
            >
              {item.highlight && item.highlight !== "none" && (
                <p className="mb-3 text-xs font-semibold uppercase text-[var(--secondary-color)]">
                  {item.highlight === "popular" ? "Popularno" : "Najbolja vrednost"}
                </p>
              )}
              <h3 className="text-xl font-semibold">{item.title}</h3>
              {item.description && (
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {item.description}
                </p>
              )}
              {item.price && (
                <p className="mt-5 text-3xl font-bold">
                  {formatPrice(item.price)}
                </p>
              )}
              {item.features && item.features.length > 0 && (
                <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-6 text-gray-700">
                  {item.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              )}
              {item.href && item.ctaLabel && (
                <Link
                  href={item.href}
                  className="mt-6 inline-flex rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  {item.ctaLabel}
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
