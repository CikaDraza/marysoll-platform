// src/components/conversational/blocks/HeroPrimaryBlock.tsx
"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import Link from "next/link";
import { LayoutBlockType } from "@/types/conversational/blocks";

interface Props {
  block: Extract<LayoutBlockType, { type: "HeroPrimaryBlock" }>;
}

export function HeroPrimaryBlock({ block }: Props) {
  const {
    id,
    title,
    subtitle,
    ctaLabel,
    href,
    align,
    size,
    visibility,
    className,
    variant,
  } = block;
  if (visibility === "hidden") return null;

  const styles = clsx(
    "mx-auto inline-flex w-full justify-center rounded-md px-6 py-4 text-sm font-semibold transition",
    variant === "primary"
      ? "bg-(--secondary-color) text-white hover:bg-(--secondary-color)/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary-color)"
      : "bg-white text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 sm:w-auto",
    size === "lg" && "text-4xl! md:text-9xl!",
    size === "md" && "text-3xl! md:text-7xl!",
    size === "sm" && "text-2xl! md:text-5xl!",
    align === "center" ? "text-center" : "text-left",
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={clsx(
        "relative w-full",
        visibility === "minimized" && "opacity-60",
        className,
      )}
    >
      <div
        id={id}
        aria-hidden="true"
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-288.75"
        />
      </div>
      <div
        className={clsx(
          "mx-auto max-w-5xl px-6 py-16",
          align === "center" ? "text-center" : "text-left",
        )}
      >
        <h1
          className={clsx(
            "font-semibold tracking-tight",
            size === "lg" && "text-4xl! md:text-9xl!",
            size === "md" && "text-3xl! md:text-7xl!",
            size === "sm" && "text-2xl! md:text-5xl!",
          )}
        >
          {title}
        </h1>

        {subtitle && (
          <p className="mt-8 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">
            {subtitle}
          </p>
        )}
        {ctaLabel && href && (
          <Link href={href || "/"} className={styles + className}>
            {ctaLabel}
          </Link>
        )}
      </div>
    </motion.section>
  );
}
