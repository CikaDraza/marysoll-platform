"use client";

/**
 * Growth Studio — "Pozovite prijateljicu" (share voucher, Phase 2).
 * Klijent generiše poklon-vaučer; prijateljica ga iskoristi pri zakazivanju.
 * Prikazuje se samo kada salon uključi deljenje (config.sharing.enabled).
 */
import { useState } from "react";
import {
  useShareVoucher,
  describeLoyaltyReward,
  type LoyaltyRewardInfo,
  type SharedVoucherResult,
} from "@/hooks/useLoyalty";

const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

export function ShareVoucherCard({
  friendReward,
}: {
  friendReward: LoyaltyRewardInfo | null;
}) {
  const share = useShareVoucher();
  const [result, setResult] = useState<SharedVoucherResult | null>(null);
  const [copied, setCopied] = useState(false);

  const rewardText = friendReward
    ? describeLoyaltyReward(friendReward)
    : "popust";

  const handleShare = () => {
    share.mutate(undefined, { onSuccess: (data) => setResult(data) });
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard nedostupan — korisnik prepisuje kod ručno */
    }
  };

  return (
    <div className={card}>
      <h3 className="text-sm font-black text-gray-900 dark:text-white mb-1">
        Pozovite prijateljicu 🎁
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Poklonite {rewardText} — prijateljica ga iskoristi pri zakazivanju.
      </p>

      {!result ? (
        <button
          onClick={handleShare}
          disabled={share.isPending}
          className="w-full rounded-lg bg-violet-600 text-white text-sm font-semibold py-2.5 hover:bg-violet-700 disabled:opacity-50 transition"
        >
          {share.isPending ? "Generišem…" : "Pokloni vaučer"}
        </button>
      ) : (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Kod za prijateljicu:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-base font-black tracking-widest text-violet-700 dark:text-violet-300 text-center">
              {result.code}
            </code>
            <button
              onClick={handleCopy}
              className="rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs font-semibold px-3 py-2.5 hover:opacity-90 transition whitespace-nowrap"
            >
              {copied ? "Kopirano ✓" : "Kopiraj"}
            </button>
          </div>
          <button
            onClick={() => setResult(null)}
            className="mt-3 text-xs text-violet-600 dark:text-violet-400 hover:underline"
          >
            Napravi još jedan
          </button>
        </div>
      )}

      {share.isError && (
        <p className="mt-3 text-xs text-red-500">
          Nije uspelo. Pokušajte ponovo.
        </p>
      )}
    </div>
  );
}
