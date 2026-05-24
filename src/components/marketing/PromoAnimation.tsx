"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DURATIONS = [2500, 3000, 3000, 2500];
const TOTAL = DURATIONS.reduce((a, b) => a + b, 0);

interface Particle {
  left: string;
  top: string;
  opacity: number;
  animationDelay: string;
  animationDuration: string;
}

const PARTICLES: Particle[] = [
  { left: "8%",  top: "12%", opacity: 0.25, animationDelay: "0.0s", animationDuration: "4.2s" },
  { left: "23%", top: "34%", opacity: 0.18, animationDelay: "1.1s", animationDuration: "5.0s" },
  { left: "41%", top: "7%",  opacity: 0.30, animationDelay: "2.3s", animationDuration: "3.8s" },
  { left: "57%", top: "55%", opacity: 0.22, animationDelay: "0.7s", animationDuration: "4.6s" },
  { left: "74%", top: "19%", opacity: 0.15, animationDelay: "3.5s", animationDuration: "5.5s" },
  { left: "88%", top: "72%", opacity: 0.28, animationDelay: "1.8s", animationDuration: "3.3s" },
  { left: "15%", top: "81%", opacity: 0.20, animationDelay: "4.2s", animationDuration: "4.9s" },
  { left: "33%", top: "63%", opacity: 0.35, animationDelay: "0.4s", animationDuration: "3.6s" },
  { left: "50%", top: "90%", opacity: 0.17, animationDelay: "2.9s", animationDuration: "5.2s" },
  { left: "67%", top: "44%", opacity: 0.26, animationDelay: "1.5s", animationDuration: "4.0s" },
  { left: "82%", top: "28%", opacity: 0.14, animationDelay: "3.8s", animationDuration: "3.4s" },
  { left: "6%",  top: "50%", opacity: 0.32, animationDelay: "0.9s", animationDuration: "5.8s" },
  { left: "28%", top: "17%", opacity: 0.19, animationDelay: "2.1s", animationDuration: "4.4s" },
  { left: "45%", top: "76%", opacity: 0.24, animationDelay: "4.6s", animationDuration: "3.1s" },
  { left: "62%", top: "5%",  opacity: 0.38, animationDelay: "1.3s", animationDuration: "5.6s" },
  { left: "79%", top: "88%", opacity: 0.16, animationDelay: "3.0s", animationDuration: "4.1s" },
  { left: "94%", top: "40%", opacity: 0.29, animationDelay: "0.2s", animationDuration: "3.9s" },
  { left: "18%", top: "95%", opacity: 0.21, animationDelay: "4.8s", animationDuration: "5.3s" },
  { left: "37%", top: "30%", opacity: 0.33, animationDelay: "2.6s", animationDuration: "4.7s" },
  { left: "55%", top: "68%", opacity: 0.12, animationDelay: "1.7s", animationDuration: "3.5s" },
];

export default function PromoAnimation() {
  const [currentScene, setCurrentScene] = useState(-1);
  const [dmShown, setDmShown] = useState([false, false, false]);
  const [progressPct, setProgressPct] = useState(0);
  const [hasEnded, setHasEnded] = useState(false);

  const animTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dmTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const stopAll = useCallback(() => {
    animTimersRef.current.forEach(clearTimeout);
    dmTimersRef.current.forEach(clearTimeout);
    animTimersRef.current = [];
    dmTimersRef.current = [];
    cancelAnimationFrame(rafRef.current);
  }, []);

  const startAnimation = useCallback(() => {
    stopAll();
    setCurrentScene(0);
    setDmShown([false, false, false]);
    setProgressPct(0);
    setHasEnded(false);

    // Schedule scene transitions
    let elapsed = 0;
    for (let i = 1; i < DURATIONS.length; i++) {
      elapsed += DURATIONS[i - 1];
      const capturedIdx = i;
      const t = setTimeout(() => setCurrentScene(capturedIdx), elapsed);
      animTimersRef.current.push(t);
    }

    // Progress bar via rAF
    startTimeRef.current = performance.now();
    const tick = (now: number) => {
      const pct = Math.min(100, ((now - startTimeRef.current) / TOTAL) * 100);
      setProgressPct(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setHasEnded(true);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopAll]);

  // Auto-start on mount
  useEffect(() => {
    const t = setTimeout(startAnimation, 300);
    return () => {
      clearTimeout(t);
      stopAll();
    };
  }, [startAnimation, stopAll]);

  // DM bubbles
  useEffect(() => {
    dmTimersRef.current.forEach(clearTimeout);
    dmTimersRef.current = [];
    async function showDMs() {
      if (currentScene !== 0) {
        setDmShown([false, false, false]);
        return;
      }
    }
    showDMs();
    const t1 = setTimeout(() => setDmShown((p) => [true, p[1], p[2]]), 200);
    const t2 = setTimeout(() => setDmShown((p) => [p[0], true, p[2]]), 700);
    const t3 = setTimeout(() => setDmShown((p) => [p[0], p[1], true]), 1300);
    dmTimersRef.current = [t1, t2, t3];
  }, [currentScene]);

  const scene3Active = currentScene === 2;

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-violet-100 p-3 w-full max-w-[480px] mx-auto">
      {/* Stage */}
      <div
        className="aspect-[9/16] w-full rounded-2xl overflow-hidden relative"
        style={{ background: "#0a0010" }}
      >
        {/* Particles */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute w-[3px] h-[3px] rounded-full"
            style={{
              left: p.left,
              top: p.top,
              background: "rgba(167,139,250,0.5)",
              opacity: p.opacity,
              animation: `floatParticle ${p.animationDuration} ease-in-out ${p.animationDelay} infinite`,
            }}
          />
        ))}

        {/* ── SCENE 1: DM Chaos ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            opacity: currentScene === 0 ? 1 : 0,
            transition: "opacity 0.4s ease",
            pointerEvents: currentScene === 0 ? "auto" : "none",
          }}
        >
          {/* BG */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 30% 20%, #5b21b6 0%, #1e003a 50%, #0a0010 100%)",
            }}
          />
          {/* Phone mockup */}
          <div
            className="relative z-10 rounded-[28px] p-3 shadow-2xl"
            style={{
              width: 200,
              background: "#fff",
              boxShadow: "0 0 60px rgba(139,92,246,0.5)",
            }}
          >
            <div className="flex items-center gap-1.5 border-b border-gray-100 pb-2 mb-2">
              <div
                className="w-6 h-6 rounded-full flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg,#f472b6,#a855f7)",
                }}
              />
              <span className="text-[11px] font-semibold text-gray-900">
                Instagram DMs
              </span>
            </div>
            {[
              "Imate li slobodno danas u 5? 🙏",
              "Koja je cena za pramenove?",
              "Može ipak sutra, otkaži mi ono... 😅",
            ].map((txt, i) => (
              <div
                key={i}
                className="flex mb-1.5"
                style={{
                  opacity: dmShown[i] ? 1 : 0,
                  transform: dmShown[i] ? "translateY(0)" : "translateY(8px)",
                  transition: "all 0.3s ease",
                }}
              >
                <div
                  className="w-[18px] h-[18px] rounded-full flex-shrink-0 mr-1.5 mt-0.5"
                  style={{
                    background: "linear-gradient(135deg,#f472b6,#a855f7)",
                  }}
                />
                <div
                  className="text-[9px] text-gray-700 leading-snug rounded-xl rounded-tl-sm px-2 py-1.5 max-w-[140px]"
                  style={{ background: "#f3f0ff" }}
                >
                  {txt}
                </div>
              </div>
            ))}
          </div>
          {/* Overlay text */}
          <div
            className="absolute bottom-14 left-0 right-0 text-center z-10"
            style={{
              opacity: currentScene === 0 ? 1 : 0,
              transform:
                currentScene === 0 ? "translateY(0)" : "translateY(10px)",
              transition: "all 0.5s ease 0.8s",
            }}
          >
            <p
              className="text-white text-base font-bold leading-snug"
              style={{ textShadow: "0 0 20px rgba(139,92,246,0.8)" }}
            >
              I dalje gubite vreme
              <br />u <span className="text-purple-300">DM-u?</span>
            </p>
          </div>
        </div>

        {/* ── SCENE 2: Booking App ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            opacity: currentScene === 1 ? 1 : 0,
            transition: "opacity 0.4s ease",
            pointerEvents: currentScene === 1 ? "auto" : "none",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 70% 80%, #7c3aed 0%, #1e003a 50%, #0a0010 100%)",
            }}
          />
          {/* Top overlay text */}
          <div
            className="absolute top-7 left-0 right-0 text-center z-10"
            style={{
              opacity: currentScene === 1 ? 1 : 0,
              transition: "opacity 0.6s ease 0.5s",
            }}
          >
            <p className="text-purple-200 text-[12px] font-medium">
              Vaš salon, vaš sistem
            </p>
            <h2 className="text-white text-xl font-extrabold leading-tight mt-0.5">
              Marysoll
              <br />
              <span className="text-purple-300">radi za vas.</span> 24/7.
            </h2>
          </div>
          {/* App card */}
          <div
            className="relative z-10 rounded-[20px] overflow-hidden"
            style={{
              width: 220,
              background: "#fff",
              boxShadow: "0 0 60px rgba(139,92,246,0.6)",
              opacity: currentScene === 1 ? 1 : 0,
              transform:
                currentScene === 1
                  ? "scale(1) translateY(0)"
                  : "scale(0.9) translateY(20px)",
              transition: "all 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s",
            }}
          >
            <div
              className="flex items-center gap-2 px-3 py-3"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                M
              </div>
              <span className="text-white text-[12px] font-semibold">
                Zakaži termin
              </span>
            </div>
            <div className="p-2.5">
              <p className="text-[9px] text-gray-400 mb-1">Izaberi uslugu</p>
              <div className="grid grid-cols-2 gap-1 mb-2">
                {[
                  ["Manikir", false],
                  ["Pedikir", false],
                  ["Gel lak", true],
                  ["Izlivanje", false],
                ].map(([label, sel]) => (
                  <div
                    key={label as string}
                    className="border rounded-lg p-1 text-[8px] text-center"
                    style={
                      sel
                        ? {
                            borderColor: "#7c3aed",
                            background: "#f5f3ff",
                            color: "#7c3aed",
                            fontWeight: 600,
                          }
                        : { borderColor: "#e5e7eb", color: "#555" }
                    }
                  >
                    {label as string}
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-gray-400 mb-1">Slobodni termini</p>
              <div className="grid grid-cols-3 gap-1 mb-2">
                {[
                  ["09:00", false],
                  ["10:30", false],
                  ["14:00", true],
                  ["15:30", false],
                  ["16:00", false],
                  ["17:30", false],
                ].map(([t, sel]) => (
                  <div
                    key={t as string}
                    className="border rounded-md p-1 text-[8px] text-center"
                    style={
                      sel
                        ? {
                            background: "#7c3aed",
                            color: "#fff",
                            borderColor: "#7c3aed",
                          }
                        : { borderColor: "#d1d5db", color: "#555" }
                    }
                  >
                    {t as string}
                  </div>
                ))}
              </div>
              <button
                className="w-full text-white text-[10px] font-bold py-2 rounded-lg"
                style={{ background: "linear-gradient(90deg,#7c3aed,#a855f7)" }}
              >
                Zakaži odmah →
              </button>
            </div>
          </div>
        </div>

        {/* ── SCENE 3: Stats ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            opacity: currentScene === 2 ? 1 : 0,
            transition: "opacity 0.4s ease",
            pointerEvents: currentScene === 2 ? "auto" : "none",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 30% 20%, #5b21b6 0%, #1e003a 50%, #0a0010 100%)",
            }}
          />
          {/* Center text */}
          <div
            className="text-center mb-4 relative z-10"
            style={{
              opacity: currentScene === 2 ? 1 : 0,
              transition: "opacity 0.6s ease",
            }}
          >
            <p className="text-purple-300 text-[12px]">Admin panel</p>
            <h2 className="text-white text-[19px] font-extrabold leading-snug">
              Više zakazivanja.
              <br />
              Manje stresa.
            </h2>
          </div>
          {/* Stat grid */}
          <div
            className="grid grid-cols-2 gap-2.5 relative z-10"
            style={{ width: 240 }}
          >
            {[
              {
                icon: "📅",
                label: "Termini danas",
                val: "12",
                sub: "+3 od juče",
                delay: "0.1s",
              },
              {
                icon: "💰",
                label: "Prihod",
                val: "48k",
                sub: "RSD ovaj mesec",
                delay: "0.25s",
              },
              {
                icon: "👥",
                label: "Klijenti",
                val: "134",
                sub: "aktivnih",
                delay: "0.4s",
              },
              {
                icon: "⭐",
                label: "Ocena",
                val: "4.9",
                sub: "prosek",
                delay: "0.55s",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl p-3"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(167,139,250,0.3)",
                  opacity: 0,
                  transform: "translateY(15px)",
                  animation: scene3Active
                    ? `fadeUp 0.5s ease ${s.delay} forwards`
                    : "none",
                }}
              >
                <div className="text-lg mb-1">{s.icon}</div>
                <div className="text-[9px] mb-1" style={{ color: "#a78bfa" }}>
                  {s.label}
                </div>
                <div className="text-xl font-extrabold text-white">{s.val}</div>
                <div className="text-[9px] mt-0.5" style={{ color: "#7c3aed" }}>
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
          {/* Confirm pill */}
          <div
            className="mt-3 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full relative z-10"
            style={{
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.4)",
              opacity: currentScene === 2 ? 1 : 0,
              transition: "opacity 0.5s ease 0.8s",
            }}
          >
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white flex-shrink-0"
              style={{ background: "#10b981" }}
            >
              ✓
            </div>
            <span
              className="text-[10px] font-semibold"
              style={{ color: "#34d399" }}
            >
              Termin potvrđen — Ana M. u 14:00
            </span>
          </div>
        </div>

        {/* ── SCENE 4: Brand ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            opacity: currentScene === 3 ? 1 : 0,
            transition: "opacity 0.4s ease",
            pointerEvents: currentScene === 3 ? "auto" : "none",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 70% 80%, #7c3aed 0%, #1e003a 50%, #0a0010 100%)",
            }}
          />
          {/* Glow rings */}
          <div
            className="absolute rounded-full"
            style={{
              width: 200,
              height: 200,
              border: "1px solid rgba(167,139,250,0.15)",
              top: "50%",
              left: "50%",
              transform:
                currentScene === 3
                  ? "translate(-50%,-50%) scale(1)"
                  : "translate(-50%,-50%) scale(0)",
              transition: "transform 1s ease 0.3s",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 280,
              height: 280,
              border: "1px solid rgba(139,92,246,0.1)",
              top: "50%",
              left: "50%",
              transform:
                currentScene === 3
                  ? "translate(-50%,-50%) scale(1)"
                  : "translate(-50%,-50%) scale(0)",
              transition: "transform 1.2s ease 0.5s",
            }}
          />
          {/* Brand content */}
          <div className="flex flex-col items-center gap-4 relative z-10">
            <div
              className="w-20 h-20 rounded-[22px] flex items-center justify-center text-4xl font-extrabold text-white"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                boxShadow:
                  "0 0 40px rgba(167,139,250,0.6), 0 0 80px rgba(139,92,246,0.3)",
                opacity: currentScene === 3 ? 1 : 0,
                transform: currentScene === 3 ? "scale(1)" : "scale(0.7)",
                transition: "all 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s",
              }}
            >
              M
            </div>
            <div
              className="text-white text-3xl font-extrabold tracking-tight"
              style={{
                opacity: currentScene === 3 ? 1 : 0,
                transform:
                  currentScene === 3 ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.5s ease 0.5s",
              }}
            >
              Marysoll
            </div>
            <div
              className="text-center text-[12px] leading-relaxed max-w-[220px]"
              style={{
                color: "#c4b5fd",
                opacity: currentScene === 3 ? 1 : 0,
                transition: "opacity 0.5s ease 0.9s",
              }}
            >
              Beauty business operating system
              <br />
              za moderne salone
            </div>
            <div
              className="px-7 py-2.5 rounded-full text-[12px] font-bold text-white"
              style={{
                background: "linear-gradient(90deg,#7c3aed,#a855f7)",
                opacity: currentScene === 3 ? 1 : 0,
                transition: "opacity 0.5s ease 1.2s",
              }}
            >
              marysoll.com
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="absolute bottom-0 left-0 h-[3px] z-10 rounded-r-sm"
          style={{
            width: `${progressPct}%`,
            background: "linear-gradient(90deg,#7c3aed,#c084fc)",
          }}
        />

        {/* Replay button */}
        {hasEnded && (
          <button
            onClick={startAnimation}
            className="absolute bottom-5 right-4 z-20 text-white text-[10px] px-2.5 py-1 rounded-full cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            ↺ Ponovo
          </button>
        )}
      </div>
    </div>
  );
}
