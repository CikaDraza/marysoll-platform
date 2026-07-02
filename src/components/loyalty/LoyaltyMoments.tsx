"use client";

/**
 * Growth Studio — player za celebration momente.
 * Mountuje se u klijent panelu: povuče neviđene momente, pušta ih jedan po
 * jedan (max 3), i označava kao viđene. Self-gated: ništa ne renderuje kada
 * nema momenata ili je intensity "off".
 */
import { useState } from "react";
import {
  useLoyaltyMe,
  useLoyaltyMoments,
  useMarkMomentsSeen,
} from "@/hooks/useLoyalty";
import { LoyaltyCelebrationOverlay } from "./LoyaltyCelebrationOverlay";

export function LoyaltyMoments() {
  const { data: me } = useLoyaltyMe();
  const intensity = me?.config?.celebration?.intensity ?? "normal";
  const shouldPlay = Boolean(me?.enabled) && intensity !== "off";

  const { data } = useLoyaltyMoments(shouldPlay);
  const markSeen = useMarkMomentsSeen();

  // Queue se derivira iz query podataka; dismissedIds sprečava ponovno
  // prikazivanje dok refetch (posle markSeen) ne stigne.
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  if (!shouldPlay) return null;

  const queue = (data?.moments ?? []).filter(
    (m) => !dismissedIds.includes(m._id),
  );
  if (queue.length === 0) return null;

  const current = queue[0];

  const handleDone = () => {
    setDismissedIds((ids) => [...ids, current._id]);
    markSeen.mutate([current._id]);
  };

  return (
    <LoyaltyCelebrationOverlay
      moment={current}
      intensity={intensity}
      heartsEmoji={me?.config?.currencies?.hearts?.emoji || "❤️"}
      onDone={handleDone}
    />
  );
}
