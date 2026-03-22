// src/components/conversational/blocks/HeroVisualBlock.tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { LayoutBlock } from "@/types/conversational/layout";
import Link from "next/link";
import { Variants } from "framer-motion";

// Varijante za kontejner koji drži slike
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // Vreme između pojavljivanja dve slike
      delayChildren: 0.3, // Početno kašnjenje pre prve slike
    },
  },
};

// Varijante za svaku pojedinačnu sliku
const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100 },
  },
};

interface Props {
  block: Extract<LayoutBlock, { type: "HeroVisualBlock" }>;
}

export function HeroVisualBlock({ block }: Props) {
  const { title, subtitle, imagesUrl, visibility, href, ctaLabel } = block;
  if (visibility === "hidden") return null;

  return (
    <section className="py-16 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:flex lg:items-center lg:gap-x-10">
        {/* Tekstualni deo */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="mx-auto max-w-2xl lg:mx-0 lg:flex-auto"
        >
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">{subtitle}</p>
        </motion.div>

        {/* Grid sa slikama koji koristi staggerChildren */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show" // Animacija se okida kada kontejner uđe u vidokrug
          viewport={{ once: true }}
          className="mt-16 flex justify-center sm:mt-24 lg:mt-0 lg:shrink-0 lg:grow"
        >
          <div className="flex items-center space-x-6 lg:space-x-8">
            {/* Prva kolona */}
            <div className="grid shrink-0 grid-cols-1 gap-y-6 lg:gap-y-8">
              {[0, 1].map((idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="h-64 w-44 overflow-hidden rounded-lg"
                >
                  <Image
                    width={200}
                    height={300}
                    src={imagesUrl[idx] || ""}
                    alt=""
                    className="h-full w-full object-cover shadow-xl"
                  />
                </motion.div>
              ))}
            </div>
            {/* Druga kolona (Sredina) */}
            <div className="grid shrink-0 grid-cols-1 gap-y-6 lg:gap-y-8">
              {[2, 3, 4].map((idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="h-64 w-44 overflow-hidden rounded-lg"
                >
                  <Image
                    width={200}
                    height={300}
                    src={imagesUrl[idx] || ""}
                    alt=""
                    className="h-full w-full object-cover shadow-xl"
                  />
                </motion.div>
              ))}
            </div>
            {/* Treća kolona */}
            <div className="grid shrink-0 grid-cols-1 gap-y-6 lg:gap-y-8">
              {[5, 6].map((idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="h-64 w-44 overflow-hidden rounded-lg"
                >
                  <Image
                    width={200}
                    height={300}
                    src={imagesUrl[idx] || ""}
                    alt=""
                    className="h-full w-full object-cover shadow-xl"
                  />
                </motion.div>
              ))}
            </div>
          </div>
          <Link
            href={href || "/"}
            className="inline-block rounded-md border border-transparent bg-(--secondary-color)/90 px-8 py-3 text-center font-medium text-white hover:bg-(--secondary-color)"
          >
            {ctaLabel}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
