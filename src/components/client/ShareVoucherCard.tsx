"use client";

/**
 * Growth Studio — "Pozovite prijateljicu" (share voucher, Phase 2).
 * Klijent generiše poklon-vaučer i deli ga jednim klikom: native "Podeli"
 * (mobilni share sheet) + direktni kanali WhatsApp / Instagram / SMS / Email +
 * kopiranje koda. Prikazuje se samo kada salon uključi deljenje.
 *
 * window/navigator se koriste SAMO u onClick handlerima (ne u render-u) —
 * bez hydration mismatch-a.
 */
import { useState } from "react";
import toast from "react-hot-toast";
import {
  useShareVoucher,
  describeLoyaltyReward,
  type LoyaltyRewardInfo,
  type SharedVoucherResult,
} from "@/hooks/useLoyalty";

const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

const chan =
  "rounded-lg px-3 py-2 text-xs font-semibold text-white cursor-pointer transition hover:brightness-110";

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

  // ── Poruka za deljenje (gradi se pri kliku — window je tu dostupan) ──
  const buildMessage = (code: string): string => {
    const url = window.location.origin;
    return `Poklanjam ti ${rewardText}! 🎁 Iskoristi kod ${code} pri zakazivanju u našem salonu: ${url}`;
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopiranje nije uspelo — prepišite kod ručno.");
    }
  };

  const shareNative = async (code: string) => {
    const text = buildMessage(code);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Poklon za tebe 🎁", text });
      } catch {
        /* korisnik otkazao — nije greška */
      }
      return;
    }
    // Bez native share-a (desktop): kopiraj poruku.
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Poruka kopirana — nalepite je gde želite.");
    } catch {
      toast.error("Deljenje nije dostupno na ovom uređaju.");
    }
  };

  const openChannel = (url: string) => {
    window.open(url, "_blank", "noopener");
  };

  const shareInstagram = async (code: string) => {
    // Instagram nema URL za unapred popunjen tekst — kopiraj pa otvori IG.
    try {
      await navigator.clipboard.writeText(buildMessage(code));
      toast.success("Poruka kopirana — nalepite je u Instagram poruku ili story.");
    } catch {
      /* ignore */
    }
    window.open("https://www.instagram.com/", "_blank", "noopener");
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
          {/* Kod + kopiranje */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Kod za prijateljicu:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-base font-black tracking-widest text-violet-700 dark:text-violet-300 text-center">
              {result.code}
            </code>
            <button
              onClick={() => handleCopyCode(result.code)}
              className="rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs font-semibold px-3 py-2.5 hover:opacity-90 transition whitespace-nowrap"
            >
              {copied ? "Kopirano ✓" : "Kopiraj"}
            </button>
          </div>

          {/* Native share (jedan klik na telefonu) */}
          <button
            onClick={() => shareNative(result.code)}
            className="mt-3 w-full rounded-lg bg-violet-600 text-white text-sm font-semibold py-2.5 hover:bg-violet-700 transition"
          >
            Podeli
          </button>

          {/* Direktni kanali */}
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() =>
                openChannel(
                  `https://wa.me/?text=${encodeURIComponent(buildMessage(result.code))}`,
                )
              }
              className={`${chan} bg-[#25D366]`}
            >
              WhatsApp
            </button>
            <button
              onClick={() => shareInstagram(result.code)}
              className={`${chan} bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737]`}
            >
              Instagram
            </button>
            <button
              onClick={() =>
                openChannel(
                  `sms:?&body=${encodeURIComponent(buildMessage(result.code))}`,
                )
              }
              className={`${chan} bg-blue-600`}
            >
              SMS
            </button>
            <button
              onClick={() =>
                openChannel(
                  `mailto:?subject=${encodeURIComponent("Poklon za tebe 🎁")}&body=${encodeURIComponent(buildMessage(result.code))}`,
                )
              }
              className={`${chan} bg-gray-700`}
            >
              Email
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
