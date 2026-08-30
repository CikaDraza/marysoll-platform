import Link from "next/link";

/** Semantički obavezno: `nav` + `aria-label`, poslednja stavka bez linka. */
export function EducationBreadcrumb({
  basePath,
  current,
}: {
  basePath: string;
  current: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="font-instrument-sans text-[13px]">
      <ol className="text-ee-text-muted flex flex-wrap items-center gap-2">
        <li>
          <Link href={`${basePath}/`} className="hover:text-ee-accent underline-offset-4 hover:underline">
            Početna
          </Link>
        </li>
        <li aria-hidden="true">·</li>
        <li>
          <Link
            href={`${basePath}/edukacija`}
            className="hover:text-ee-accent underline-offset-4 hover:underline"
          >
            Edukacija
          </Link>
        </li>
        <li aria-hidden="true">·</li>
        <li aria-current="page" className="text-ee-text max-w-[24ch] truncate">
          {current}
        </li>
      </ol>
    </nav>
  );
}
