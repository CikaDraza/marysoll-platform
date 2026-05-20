"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export function CmsBackgroundDecor() {
  return (
    <div className="absolute inset-0 pointer-events-none -z-10">
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 20, repeat: Infinity }}
        className="absolute -top-40 -right-40 w-96 h-96 bg-violet-200 rounded-full blur-3xl opacity-30"
      />
      <motion.div
        animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
        transition={{ duration: 15, repeat: Infinity }}
        className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-30"
      />
    </div>
  );
}

export function BackHomeButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-violet-700 bg-white/80 backdrop-blur border border-violet-100 shadow-lg shadow-violet-200 hover:bg-violet-50 hover:text-violet-800 transition ${className}`}
    >
      <ArrowLeftIcon className="size-4" />
      Nazad na početnu
    </Link>
  );
}
