/**
 * WorkingHoursNote — sitna napomena koja stoji UMESTO radnog vremena kada je ono
 * skriveno (showWorkingHours === false ili režim "Pojedinačni termini").
 *
 * `rulesHref` — putanja do /pravila-zakazivanja sa tenant base-path-om; ako nije
 * prosleđena (npr. interni panel/dashboard), prikazuje se samo tekst bez linka.
 */
import Link from "next/link";

/**
 * AppointmentRulesLink — link do strane "Pravila zakazivanja".
 * Podebljan, podvučen, crn tekst (vidljiv i u dark modu).
 */
export function AppointmentRulesLink({
  rulesHref,
  className = "",
}: {
  rulesHref: string;
  className?: string;
}) {
  return (
    <Link
      href={rulesHref}
      className={`font-bold underline text-black dark:text-white hover:opacity-70 transition ${className}`}
    >
      Pravila zakazivanja →
    </Link>
  );
}

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
          <AppointmentRulesLink rulesHref={rulesHref} />
        </>
      ) : null}
    </p>
  );
}
