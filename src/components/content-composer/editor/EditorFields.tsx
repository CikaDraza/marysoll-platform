import type { SlugOption } from "./types";

export const inputClassName =
  "w-full rounded-md border border-gray-200 bg-gray-100 p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";
export const labelClassName =
  "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";

export function Field({
  label,
  value,
  onChange,
  textarea,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <label className={labelClassName}>{label}</label>
      {textarea ? (
        <textarea
          className={inputClassName}
          rows={rows ?? 3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          type="text"
          className={inputClassName}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

export function CtaField({
  ctaLabel,
  href,
  slugOptions,
  onLabel,
  onHref,
}: {
  ctaLabel: string;
  href: string;
  slugOptions: SlugOption[];
  onLabel: (value: string) => void;
  onHref: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Field label="CTA — tekst" value={ctaLabel} onChange={onLabel} />
      <div>
        <label className={labelClassName}>Vodi na (slug ili URL)</label>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            className={`${inputClassName} min-w-[140px] flex-1`}
            value={href}
            onChange={(event) => onHref(event.target.value)}
            placeholder="/usluge, https://… ili #sekcija"
          />
          {slugOptions.length > 0 && (
            <select
              aria-label="Izaberi CTA destinaciju"
              className={`${inputClassName} min-w-[140px] flex-1`}
              value=""
              onChange={(event) => {
                if (event.target.value) onHref(event.target.value);
              }}
            >
              <option value="">Izaberi iz liste…</option>
              {slugOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
