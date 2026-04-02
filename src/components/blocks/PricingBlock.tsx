import { formatPriceToString } from "@/helpers/formatPrice";
import { PricingBlock as PricingBlockType } from "@/types/conversational/blocks";
import Link from "next/link";

interface Props {
  block: PricingBlockType;
}

export function PricingBlock({ block }: Props) {
  const { id, className, plans, visibility } = block;

  if (visibility === "hidden") return null;
  if (!plans || plans.length === 0) return null;

  return (
    <div
      id={id}
      className={`relative isolate py-24 lg:py-36 bg-background mx-auto ${
        className ?? ""
      }`}
    >
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-3 -z-10 transform-gpu overflow-hidden px-36 blur-3xl"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="mx-auto aspect-[1155/678] w-[288.75rem] bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30"
        />
      </div>

      <div className="mx-auto max-w-7xl text-center">
        <h2 className="text-base/7 font-semibold text-[var(--secondary-color)]">
          Plan
        </h2>
        <p className="mt-2 text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-6xl">
          Izaberite pravi plan za vas
        </p>
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-lg font-medium text-pretty text-gray-600 sm:text-xl/8">
        Izaberite pristupačan plan koji je prepun najboljih funkcija za
        angažovanje publike, stvaranje lojalnosti kupaca i povećanje prodaje.
      </p>

      <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 items-center gap-y-6 sm:mt-20 sm:gap-y-0 lg:max-w-4xl lg:grid-cols-1">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="relative bg-gray-900 shadow-2xl rounded-3xl p-8 ring-1 ring-gray-900/10 sm:p-10"
          >
            <h3
              id={plan.id}
              className="text-[var(--secondary-color)] text-base/7 font-semibold"
            >
              {plan.name}
            </h3>

            <p className="mt-4 flex items-baseline gap-x-2">
              <span className="text-white text-4xl font-semibold tracking-tight">
                {plan.discount
                  ? formatPriceToString(plan.discount)
                  : formatPriceToString(plan.price)}{" "}
                {plan.currency}
              </span>
              <span className="text-gray-400 text-base">/terminu</span>
            </p>

            {plan.description && (
              <p className="text-gray-300 mt-6 text-base/7">
                {plan.description}
              </p>
            )}

            <Link
              href={plan.href}
              aria-describedby={plan.id}
              className="bg-[var(--secondary-color)] text-white shadow-xs hover:bg-[var(--secondary-color)]/90 focus-visible:outline-[var(--secondary-color)] mt-8 block rounded-md px-3.5 py-2.5 text-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 sm:mt-10"
            >
              {plan.ctaLabel ?? "Izaberi plan"}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
