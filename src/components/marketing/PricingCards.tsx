"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMarketingCms } from "@/hooks/useMarketingCms";
import type { MarketingPricingPlan } from "@/types/marketing-landing";

interface PricingCardsProps {
  /** When provided, skip the client fetch and render directly (used on SSR'd pages). */
  plans?: MarketingPricingPlan[];
}

// ─── Single card ──────────────────────────────────────────────────────────────

function PricingCard({
  plan,
  index,
}: {
  plan: MarketingPricingPlan;
  index: number;
}) {
  const popular = plan.popular;
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -10, transition: { duration: 0.2 } }}
      className={`relative rounded-3xl p-8 h-full flex flex-col ${
        popular
          ? "bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-2xl scale-[1.05] z-10"
          : "bg-white text-gray-800 shadow-lg border border-gray-100"
      }`}
    >
      {popular && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-pink-500 text-white px-4 py-1 rounded-full text-xs font-bold"
        >
          Najpopularniji
        </motion.div>
      )}

      <h3
        className={`text-xl font-bold mb-2 ${popular ? "text-white" : "text-violet-600"}`}
      >
        {plan.name}
      </h3>

      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-4xl font-bold">
          {plan.price === "0" ? "0€" : `${plan.price}€`}
        </span>
        {plan.price !== "0" && (
          <span className="text-sm opacity-70">{plan.period}</span>
        )}
      </div>

      <p
        className={`text-sm mb-6 ${popular ? "text-violet-100" : "text-gray-500"}`}
      >
        {plan.description}
      </p>

      <ul className="space-y-3 mb-8 flex-grow">
        {plan.features.map((feature, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.25, delay: 0.03 * i }}
            className="flex items-center gap-3 text-sm"
          >
            <span className="text-green-400">✓</span>
            <span>{feature}</span>
          </motion.li>
        ))}
      </ul>

      <motion.div
        className="mt-auto"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Link
          href="/register"
          className={`block w-full py-3 rounded-xl font-semibold text-center transition ${
            popular
              ? "bg-white text-violet-600 hover:bg-gray-100"
              : "bg-violet-600 text-white hover:bg-violet-700"
          }`}
        >
          {plan.ctaText}
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ─── Cards grid (shared across home + /pricing) ───────────────────────────────

export function PricingCards({ plans }: PricingCardsProps = {}) {
  const cms = useMarketingCms();
  const hasPlansProp = plans !== undefined;
  const effectivePlans = hasPlansProp ? plans : cms.landing.pricing.plans;

  if (!hasPlansProp && cms.isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-8 items-center">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-3xl p-8 bg-gray-100 animate-pulse h-80"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-8 items-stretch md:gap-x-12">
        {effectivePlans.map((plan, i) => (
          <PricingCard key={plan.name} plan={plan} index={i} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center mt-12"
      >
        <p className="text-gray-500 text-sm mb-4">
          Sve cene su sa PDV-om. Bez skrivenih troškova.
        </p>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-violet-600 text-white px-10 py-4 rounded-2xl font-semibold text-lg hover:bg-violet-700 transition shadow-xl shadow-violet-200"
          >
            Počni sa Mary već danas
            <span>→</span>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
