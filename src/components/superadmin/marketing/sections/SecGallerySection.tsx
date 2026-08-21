"use client";
/** SecGallerySection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SingleImageField } from "@/components/admin/campaign/SingleImageField";
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function SecGallerySection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* DEO 2 — Galerija */}
<div className={card}>
  <SectionHeader
    title="DEO 2 — Galerija"
    open={openSection === "sec-gallery"}
    onToggle={() => toggle("sec-gallery")}
  />
  {openSection === "sec-gallery" && (
    <div className="mt-4 space-y-3">
      <div>
        <label className={lbl}>Naslov</label>
        <input
          className={inp}
          value={ls.secondary.gallery.headline}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              gallery: {
                ...ls.secondary.gallery,
                headline: e.target.value,
              },
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>Slika</label>
        <SingleImageField
          value={ls.secondary.gallery.image}
          onChange={(url) =>
            update("secondary", {
              ...ls.secondary,
              gallery: { ...ls.secondary.gallery, image: url },
            })
          }
          scope={{ scope: "platform" }}
        />
      </div>
    </div>
  )}
</div>
    </>
  );
}
