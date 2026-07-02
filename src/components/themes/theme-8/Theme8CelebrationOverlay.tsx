"use client";

/**
 * Theme8CelebrationOverlay
 * --------------------------------------------------------------------------
 * Y2K "baddie" + Powerpuff fan-art zahvalnica preko cele strane (Marysoll OS
 * "Moment" nakon zakazivanja). Importovano iz claude.ai/design projekta
 * "Sprite sheet animation za Hvala moment".
 *
 * - Montira se na nivou provider-a (preživi unmount BookingModal-a).
 * - Lik je sprite-sheet (CSS steps) preko <SpriteSheetPlayer/> — STATIČAN
 *   (bez bob/wave kretanja), samo se vrte frejmovi.
 * - Pills su ISPOD lika, u Y2K sticker stilu (crni + pink, kao godišnji odmor):
 *   "Hvala vam što ste zakazali" pa ispod malo pomeren/zakošen "Vidimo se uskoro".
 * - Self-heal: dok se sprite sheet ne učita (ili dok ga nema), prikazuje
 *   placeholder; čim PNG postoji na putanji, sam se prebaci na animaciju.
 *
 * Font: "Bagel Fat One" (Tailwind `font-bagel`) je već učitan.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SpriteSheetPlayer from "../shared/SpriteSheetPlayer";

export interface Theme8CelebrationOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Koliko dugo stoji pre auto-zatvaranja (ms). 0 = ostaje dok se ne klikne. */
  autoDismissMs?: number;
  /** Override teksta po potrebi. */
  title?: string;
  subtitle?: string;
  /** Konfiguracija sprite-a — popunjava se kad stigne finalni sheet. */
  sprite?: {
    src: string;
    frameWidth: number;
    frameHeight: number;
    columns: number;
    rows: number;
    frames?: number;
    fps?: number;
    /** Per-frame tajming (ms) — npr. duži hold na namigu, sporiji poljubac/srca. */
    frameDurations?: number[];
    loop?: boolean;
  };
}

export default function Theme8CelebrationOverlay({
  open,
  onClose,
  autoDismissMs = 6000,
  title = "Hvala ti na zakazanom terminu🥰",
  subtitle = "Vidimo se uskoro🌸",
  sprite,
}: Theme8CelebrationOverlayProps) {
  // Auto-dismiss
  useEffect(() => {
    if (!open || !autoDismissMs) return;
    const t = setTimeout(onClose, autoDismissMs);
    return () => clearTimeout(t);
  }, [open, autoDismissMs, onClose]);

  // Esc za zatvaranje
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Preload sheet-a: prikaži lika tek kad je slika spremna (inače placeholder).
  const [spriteReady, setSpriteReady] = useState(false);
  useEffect(() => {
    if (!sprite?.src) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setSpriteReady(true);
    };
    img.src = sprite.src;
    return () => {
      cancelled = true;
    };
  }, [sprite?.src]);

  const [l1, l2] = splitTitle(title);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="theme8-celebration"
          role="dialog"
          aria-label={title}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 22,
            cursor: "pointer",
            // Tamno (kao booking modal backdrop: y2k-plum) + suptilni Y2K sjaj.
            background:
              "radial-gradient(120% 90% at 50% 38%, rgba(255,46,151,.16), rgba(139,22,201,.22) 45%, rgba(42,13,34,.88))",
            backdropFilter: "blur(14px) saturate(1.3)",
            WebkitBackdropFilter: "blur(14px) saturate(1.3)",
          }}
        >
          <Sparkles />
          <Hearts />

          {/* Lik — STATIČAN (samo sheet frejmovi, bez bob/wave kretanja) */}
          <div
            style={{ filter: "drop-shadow(0 18px 30px rgba(120,30,90,.45))" }}
          >
            {sprite && spriteReady ? (
              <SpriteSheetPlayer {...sprite} />
            ) : (
              <SpritePlaceholder />
            )}
          </div>

          {/* Pill 1 — crni (Y2K sticker), ispod lika */}
          <motion.div
            initial={{ scale: 0.4, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: -2, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
          >
            <div className="rounded-[24px] border-[3px] border-y2k-ink bg-y2k-ink px-7 py-4 text-center font-bagel text-white text-[26px] sm:text-[34px] leading-[1.05] shadow-[7px_8px_0_#ff2e97]">
              {l1}
              <br />
              {l2}
            </div>
          </motion.div>

          {/* Pill 2 — pink (Y2K sticker), malo pomeren i zakošen */}
          <motion.div
            initial={{ scale: 0.4, rotate: 8, opacity: 0 }}
            animate={{ scale: 1, rotate: 4, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 14,
              delay: 0.18,
            }}
            style={{ marginLeft: 56 }}
          >
            <div className="rounded-full border-[3px] border-y2k-ink bg-y2k-pink px-6 py-2.5 font-bagel text-white text-[18px] sm:text-[22px] shadow-[6px_7px_0_#0b0b0f]">
              {subtitle}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ----------------------------- helpers ----------------------------- */

function splitTitle(t: string): [string, string] {
  // "Hvala vam što ste zakazali" -> dve linije za pill
  const words = t.split(" ");
  if (words.length < 4) return [t, ""];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

/* Sparkle zvezdice */
function Sparkles() {
  const stars = [
    { left: "14%", top: "18%", size: 34, dur: 1.8, d: 0 },
    { left: "84%", top: "14%", size: 26, dur: 2.3, d: 0.4 },
    { left: "10%", top: "76%", size: 28, dur: 2.0, d: 0.8 },
    { left: "88%", top: "80%", size: 38, dur: 1.6, d: 0.2 },
    { left: "50%", top: "8%", size: 22, dur: 2.1, d: 0.6 },
  ];
  return (
    <>
      {stars.map((s, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            left: s.left,
            top: s.top,
            fontSize: s.size,
            color: "#fff",
            pointerEvents: "none",
          }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.15, 0.7] }}
          transition={{
            duration: s.dur,
            repeat: Infinity,
            ease: "easeInOut",
            delay: s.d,
          }}
        >
          ✦
        </motion.div>
      ))}
    </>
  );
}

/* Leteća srca */
function Hearts() {
  const items = [
    { left: "30%", emoji: "🫶", dur: 3.2, d: 0 },
    { left: "62%", emoji: "💕", dur: 3.6, d: 1.1 },
    { left: "46%", emoji: "✨", dur: 4.0, d: 0.6 },
  ];
  return (
    <>
      {items.map((h, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            left: h.left,
            bottom: 0,
            fontSize: 28,
            pointerEvents: "none",
          }}
          initial={{ y: 20, scale: 0.6, opacity: 0 }}
          animate={{ y: -200, scale: 1.1, opacity: [0, 1, 1, 0] }}
          transition={{
            duration: h.dur,
            repeat: Infinity,
            ease: "easeIn",
            delay: h.d,
          }}
        >
          {h.emoji}
        </motion.div>
      ))}
    </>
  );
}

/* Placeholder dok ne stigne / učita se finalni sheet */
function SpritePlaceholder() {
  return (
    <div
      style={{
        width: 200,
        height: 380,
        borderRadius: 24,
        border: "3px dashed #fff",
        background:
          "repeating-linear-gradient(45deg, rgba(255,255,255,.16) 0 12px, rgba(255,255,255,.06) 12px 24px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontFamily: "ui-monospace, monospace",
        fontSize: 12,
        lineHeight: 1.7,
        textAlign: "center",
        padding: 14,
      }}
    >
      SPRITE SLOT
      <br />
      180 × 350 / frame
      <br />
      Powerpuff fan-art
    </div>
  );
}
