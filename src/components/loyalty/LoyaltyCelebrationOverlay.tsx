"use client";

/**
 * Growth Studio — celebration overlay (svih tema).
 * Generalizacija theme-8 "Moments" ideje: kratka nagradna animacija
 * (+srca / vaučer otključan) sa progress prikazom. Intensity iz configa
 * kontroliše konfete; "off" se filtrira pre mountovanja (LoyaltyMoments).
 */
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LoyaltyMoment } from "@/hooks/useLoyalty";

const AUTO_DISMISS_MS = 6000;

interface Props {
  moment: LoyaltyMoment;
  intensity: "subtle" | "normal" | "max";
  heartsEmoji?: string;
  onDone: () => void;
}

// Generisano jednom pri učitavanju modula (render ostaje čist za React Compiler).
const CONFETTI_PIECES = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 1.2,
  duration: 2.2 + Math.random() * 1.6,
  emoji: ["✨", "💖", "🎉", "⭐"][i % 4],
  size: 14 + Math.random() * 14,
}));

function ConfettiField({ count }: { count: number }) {
  const pieces = CONFETTI_PIECES.slice(0, count);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: "-10%", opacity: 0, rotate: 0 }}
          animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate: 360 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "linear" }}
          className="absolute top-0"
          style={{ left: `${p.left}%`, fontSize: p.size }}
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
}

function HeartsProgress({
  balance,
  required,
  emoji,
}: {
  balance: number;
  required: number;
  emoji: string;
}) {
  const total = Math.max(required, 1);
  const filled = Math.max(0, Math.min(balance, total));
  return (
    <div className="flex items-center justify-center gap-1.5 text-2xl">
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: i < filled ? 1 : 0.25 }}
          transition={{ delay: 0.4 + i * 0.12, type: "spring", stiffness: 300 }}
          className={i < filled ? "" : "grayscale"}
        >
          {emoji}
        </motion.span>
      ))}
    </div>
  );
}

export function LoyaltyCelebrationOverlay({
  moment,
  intensity,
  heartsEmoji = "❤️",
  onDone,
}: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  const isVoucher = moment.type === "loyalty_voucher_received";
  const meta = moment.metadata ?? {};
  const confettiCount =
    intensity === "max" ? 36 : intensity === "normal" ? 18 : 0;

  return (
    <AnimatePresence>
      <motion.div
        key={moment._id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDone}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm cursor-pointer"
        role="dialog"
        aria-label={moment.title}
      >
        {confettiCount > 0 && <ConfettiField count={confettiCount} />}

        <motion.div
          initial={{ scale: 0.7, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-gray-900 shadow-2xl p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="text-6xl mb-3"
          >
            {isVoucher ? "🎁" : heartsEmoji}
          </motion.div>

          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
            {moment.title}
          </h3>

          {isVoucher && meta.voucherCode ? (
            <div className="my-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {moment.message}
              </p>
              <div className="inline-block rounded-2xl border-2 border-dashed border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/40 px-6 py-3">
                <span className="text-lg font-black tracking-widest text-violet-700 dark:text-violet-300">
                  {meta.voucherCode}
                </span>
              </div>
              {meta.voucherExpiresAt && (
                <p className="mt-3 text-xs text-gray-400">
                  Važi do {meta.voucherExpiresAt}
                </p>
              )}
            </div>
          ) : (
            <div className="my-4 space-y-3">
              {typeof meta.heartsBalance === "number" &&
                typeof meta.heartsRequired === "number" &&
                meta.heartsRequired > 0 && (
                  <HeartsProgress
                    balance={meta.heartsBalance}
                    required={meta.heartsRequired}
                    emoji={heartsEmoji}
                  />
                )}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {moment.message}
              </p>
            </div>
          )}

          <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-2">
            Dodirni za nastavak
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
