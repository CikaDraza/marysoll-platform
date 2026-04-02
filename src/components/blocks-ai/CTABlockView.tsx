"use client";

import Link from "next/link";
import clsx from "clsx";
import { CTABlock } from "@/types/landing-blocks";

export function CTABlockView({ block }: { block: CTABlock }) {
  const { id, label, href } = block;

  const styles = clsx(
    "mx-auto inline-flex w-full justify-center rounded-md px-6 py-4 text-sm font-semibold transition bg-(--secondary-color) text-white hover:bg-(--secondary-color)/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary-color)",
  );

  return (
    <Link id={id} href={href || "/"} className={styles}>
      {label}
    </Link>
  );
}
