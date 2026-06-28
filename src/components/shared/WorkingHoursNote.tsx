/**
 * WorkingHoursNote — sitna napomena koja stoji UMESTO radnog vremena kada je ono
 * skriveno (showWorkingHours === false ili režim "Pojedinačni termini").
 *
 * `rulesHref` — putanja do /pravila-zakazivanja sa tenant base-path-om; ako nije
 * prosleđena (npr. interni panel/dashboard), prikazuje se samo tekst bez linka.
 */
import Link from "next/link";

export function WorkingHoursNote({
  rulesHref,
  className = "",
}: {
  rulesHref?: string;
  className?: string;
}) {
  return (
    <p className={`text-[11px] leading-snug text-gray-400 ${className}`}>
      Termini se zakazuju putem aplikacije.
      {rulesHref ? (
        <>
          {" "}
          <Link
            href={rulesHref}
            className="underline hover:text-gray-600 transition"
          >
            Pravila zakazivanja →
          </Link>
        </>
      ) : null}
    </p>
  );
}
