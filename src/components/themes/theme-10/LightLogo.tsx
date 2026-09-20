/**
 * LightLogo — logo salona na tamnoj podlozi (CTA panel, footer).
 *
 * Salon ima jedan logo, najčešće taman. Na tamnoj podlozi se zato prikazuje
 * kao jednobojni svetli znak (filter), a bez logotipa stoji ime salona.
 */
export function LightLogo({
  salonName,
  logo,
  className,
  textClassName,
}: {
  salonName: string;
  logo?: string;
  className: string;
  textClassName: string;
}) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logo je proizvoljnog formata/domena
      <img
        src={logo}
        alt={salonName}
        loading="lazy"
        className={`block w-auto [filter:brightness(0)_invert(0.94)] ${className}`}
      />
    );
  }
  return (
    <span
      className={`font-cormorant uppercase leading-none tracking-[0.12em] text-ash-paper-2 ${textClassName}`}
    >
      {salonName}
    </span>
  );
}
