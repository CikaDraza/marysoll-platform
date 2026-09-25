"use client";

import type { MarketingBanner } from "@/types/theme8-marketing";
import { ImageInputField, inp, lbl, ToggleSwitch } from "./primitives";

interface FieldsProps {
  banner: MarketingBanner;
  onPatch: (patch: Partial<MarketingBanner>) => void;
}

const action = "rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800";

function ContentFields({ banner, onPatch }: FieldsProps) {
  return <>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div><label className={lbl}>Ime u CMS-u</label><input className={inp} value={banner.name ?? ""} placeholder={banner.title || "Automatski iz naslova"} onChange={(event) => onPatch({ name: event.target.value })} /></div>
      <div><label className={lbl}>Naslov</label><input className={inp} value={banner.title ?? ""} onChange={(event) => onPatch({ title: event.target.value })} /></div>
    </div>
    <div className="mt-4"><label className={lbl}>Opis</label><textarea className={`${inp} min-h-24`} value={banner.description ?? ""} onChange={(event) => onPatch({ description: event.target.value })} /></div>
    <div className="mt-4"><label className={lbl}>Deo opisa u roze boji (mora se nalaziti u opisu)</label><input className={inp} value={banner.accentPhrase ?? ""} onChange={(event) => onPatch({ accentPhrase: event.target.value })} /></div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <ImageInputField label="Glavna slika (3:4)" value={banner.image.url} onChange={(url) => onPatch({ image: { ...banner.image, url } })} />
      <div><label className={lbl}>Alt tekst slike</label><input className={inp} value={banner.image.alt} onChange={(event) => onPatch({ image: { ...banner.image, alt: event.target.value } })} /></div>
    </div>
  </>;
}

function LayoutFields({ banner, onPatch }: FieldsProps) {
  return <>
    <fieldset className="mt-5">
      <legend className={lbl}>Širina na desktopu i laptopu</legend>
      <div className="flex flex-wrap gap-2">
        {([
          { value: "contained", label: "U kontejneru · 9:16", shape: "h-6 w-3.5" },
          { value: "full-width", label: "Cela širina · 16:9", shape: "h-4 w-7" },
        ] as const).map((option) => (
          <button key={option.value} type="button" aria-pressed={banner.containerStyle === option.value}
            className={`${action} flex items-center gap-2 ${banner.containerStyle === option.value ? "!border-violet-600 !bg-violet-600 !text-white" : ""}`}
            onClick={() => onPatch({ containerStyle: option.value })}>
            <span aria-hidden="true" className={`${option.shape} inline-block rounded-sm border-2 border-current`} />{option.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-500">Na telefonu se oba prikazuju kao uspravna slika sa tekstom ispod.</p>
    </fieldset>
    {banner.containerStyle === "full-width" && (
      <div className="mt-4"><ImageInputField label="Pozadinska slika za celu širinu" value={banner.backgroundImage?.url ?? ""} onChange={(url) => onPatch({ backgroundImage: { ...banner.backgroundImage, url } })} /></div>
    )}
  </>;
}

function CtaFields({ banner, onPatch }: FieldsProps) {
  const cta = banner.cta ?? { enabled: false, label: "Saznaj više", destination: { type: "custom" as const, url: "" } };
  return (
    <div className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-800 space-y-3">
      <div className="flex items-center justify-between gap-3"><span className="font-semibold text-sm">CTA dugme</span><ToggleSwitch checked={cta.enabled} onChange={(enabled) => onPatch({ cta: { ...cta, enabled } })} label="Prikaži CTA" /></div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><label className={lbl}>Tekst dugmeta</label><input className={inp} value={cta.label ?? ""} onChange={(event) => onPatch({ cta: { ...cta, label: event.target.value } })} /></div>
        <div><label className={lbl}>Odredište</label><select className={inp} value={cta.destination.type} onChange={(event) => onPatch({ cta: { ...cta, destination: event.target.value === "edu-center" ? { type: "edu-center" } : { type: "custom", url: "" } } })}><option value="custom">Uneti link</option><option value="edu-center">Edu Centar</option></select></div>
      </div>
      {cta.destination.type === "custom" && <div><label className={lbl}>Link</label><input className={inp} value={cta.destination.url} placeholder="https://... ili /putanja" onChange={(event) => onPatch({ cta: { ...cta, destination: { type: "custom", url: event.target.value } } })} /></div>}
    </div>
  );
}

function DividerFields({ banner, onPatch }: FieldsProps) {
  return (
    <div className="mt-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800 space-y-3">
      <div className="flex items-center justify-between gap-3"><span className="font-semibold text-sm">Ukras iznad banera</span><ToggleSwitch checked={banner.divider?.enabled ?? false} onChange={(enabled) => onPatch({ divider: { ...banner.divider, enabled } })} label="Prikaži divider" /></div>
      <ImageInputField label="SVG divider (opciono)" value={banner.divider?.url ?? ""} onChange={(url) => onPatch({ divider: { ...banner.divider, enabled: banner.divider?.enabled ?? false, url } })} />
      <button type="button" className={action} onClick={() => onPatch({ divider: { enabled: true, url: "/images/theme-8/divider/divider-banner.svg" } })}>Koristi Y2K divider</button>
    </div>
  );
}

export function Theme8MarketingBannerFields(props: FieldsProps) {
  return <>
    <ContentFields {...props} />
    <LayoutFields {...props} />
    <CtaFields {...props} />
    <DividerFields {...props} />
  </>;
}
