"use client";
/** SecBookingSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SingleVideoField } from "@/components/admin/campaign/SingleVideoField";
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function SecBookingSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* DEO 2 — Marysoll Booking */}
<div className={card}>
  <SectionHeader
    title="DEO 2 — Marysoll Booking"
    open={openSection === "sec-booking"}
    onToggle={() => toggle("sec-booking")}
  />
  {openSection === "sec-booking" && (
    <div className="mt-4 space-y-4">
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={ls.secondary.booking.enabled}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              booking: {
                ...ls.secondary.booking,
                enabled: e.target.checked,
              },
            })
          }
        />
        Prikaži Booking sekciju
      </label>

      {/* ── Sekcija 1 — promo + video ── */}
      <div>
        <label className={lbl}>H2 naslov</label>
        <input
          className={inp}
          value={ls.secondary.booking.headline}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              booking: {
                ...ls.secondary.booking,
                headline: e.target.value,
              },
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>Uvodni tekst</label>
        <textarea
          className={inp}
          rows={2}
          value={ls.secondary.booking.intro}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              booking: {
                ...ls.secondary.booking,
                intro: e.target.value,
              },
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>
          Primeri pretrage (jedan po liniji)
        </label>
        <textarea
          className={inp}
          rows={5}
          value={ls.secondary.booking.searchExamples.join("\n")}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              booking: {
                ...ls.secondary.booking,
                searchExamples: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              },
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>Zaključni paragraf</label>
        <textarea
          className={inp}
          rows={2}
          value={ls.secondary.booking.closing}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              booking: {
                ...ls.secondary.booking,
                closing: e.target.value,
              },
            })
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>CTA tekst</label>
          <input
            className={inp}
            value={ls.secondary.booking.ctaText}
            onChange={(e) =>
              update("secondary", {
                ...ls.secondary,
                booking: {
                  ...ls.secondary.booking,
                  ctaText: e.target.value,
                },
              })
            }
          />
        </div>
        <div>
          <label className={lbl}>CTA link</label>
          <input
            className={inp}
            value={ls.secondary.booking.ctaHref}
            onChange={(e) =>
              update("secondary", {
                ...ls.secondary,
                booking: {
                  ...ls.secondary.booking,
                  ctaHref: e.target.value,
                },
              })
            }
          />
        </div>
      </div>
      <div>
        <label className={lbl}>Video</label>
        <SingleVideoField
          value={ls.secondary.booking.videoUrl}
          onChange={(url) =>
            update("secondary", {
              ...ls.secondary,
              booking: { ...ls.secondary.booking, videoUrl: url },
            })
          }
        />
      </div>

      {/* ── Sekcija 2 — discovery flow ── */}
      <div className="border-t border-slate-700 pt-4">
        <label className={lbl}>H2 naslov (discovery)</label>
        <input
          className={inp}
          value={ls.secondary.booking.discoveryHeadline}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              booking: {
                ...ls.secondary.booking,
                discoveryHeadline: e.target.value,
              },
            })
          }
        />
      </div>
      {ls.secondary.booking.discoveryCards.map((cardItem, i) => (
        <div
          key={i}
          className="bg-slate-700/40 rounded-lg p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-bold uppercase">
              Kartica {i + 1}
            </p>
            <button
              className="text-xs text-red-400 hover:text-red-300 transition"
              onClick={() => {
                const discoveryCards =
                  ls.secondary.booking.discoveryCards.filter(
                    (_, idx) => idx !== i,
                  );
                update("secondary", {
                  ...ls.secondary,
                  booking: { ...ls.secondary.booking, discoveryCards },
                });
              }}
            >
              Obriši
            </button>
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <div>
              <label className={lbl}>Ikona</label>
              <input
                className={inp}
                value={cardItem.icon}
                onChange={(e) => {
                  const discoveryCards = [
                    ...ls.secondary.booking.discoveryCards,
                  ];
                  discoveryCards[i] = {
                    ...discoveryCards[i],
                    icon: e.target.value,
                  };
                  update("secondary", {
                    ...ls.secondary,
                    booking: {
                      ...ls.secondary.booking,
                      discoveryCards,
                    },
                  });
                }}
              />
            </div>
            <div>
              <label className={lbl}>Naslov</label>
              <input
                className={inp}
                value={cardItem.title}
                onChange={(e) => {
                  const discoveryCards = [
                    ...ls.secondary.booking.discoveryCards,
                  ];
                  discoveryCards[i] = {
                    ...discoveryCards[i],
                    title: e.target.value,
                  };
                  update("secondary", {
                    ...ls.secondary,
                    booking: {
                      ...ls.secondary.booking,
                      discoveryCards,
                    },
                  });
                }}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>Opis</label>
            <input
              className={inp}
              value={cardItem.description}
              onChange={(e) => {
                const discoveryCards = [
                  ...ls.secondary.booking.discoveryCards,
                ];
                discoveryCards[i] = {
                  ...discoveryCards[i],
                  description: e.target.value,
                };
                update("secondary", {
                  ...ls.secondary,
                  booking: { ...ls.secondary.booking, discoveryCards },
                });
              }}
            />
          </div>
        </div>
      ))}
      <button
        className="w-full py-2 border border-dashed border-slate-600 text-slate-400 text-xs font-bold rounded-lg hover:border-violet-500 hover:text-violet-400 transition"
        onClick={() => {
          const discoveryCards = [
            ...ls.secondary.booking.discoveryCards,
            { icon: "✨", title: "", description: "" },
          ];
          update("secondary", {
            ...ls.secondary,
            booking: { ...ls.secondary.booking, discoveryCards },
          });
        }}
      >
        + Dodaj karticu
      </button>
      <div className="grid grid-cols-2 gap-3 border-t border-slate-700 pt-4">
        <div>
          <label className={lbl}>CTA tekst (discovery)</label>
          <input
            className={inp}
            value={ls.secondary.booking.discoveryCtaText}
            onChange={(e) =>
              update("secondary", {
                ...ls.secondary,
                booking: {
                  ...ls.secondary.booking,
                  discoveryCtaText: e.target.value,
                },
              })
            }
          />
        </div>
        <div>
          <label className={lbl}>CTA link (discovery)</label>
          <input
            className={inp}
            value={ls.secondary.booking.discoveryCtaHref}
            onChange={(e) =>
              update("secondary", {
                ...ls.secondary,
                booking: {
                  ...ls.secondary.booking,
                  discoveryCtaHref: e.target.value,
                },
              })
            }
          />
        </div>
      </div>
    </div>
  )}
</div>
    </>
  );
}
