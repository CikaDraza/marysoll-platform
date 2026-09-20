/**
 * Theme10PriceList — `#cene`, prikaz `services.catalog` bloka kao cenovnik.
 *
 * Dok katalog nema trajnu vezu usluga ↔ majstor ↔ cena, prikaz koristi
 * privremenu Ash Studio matricu iz handoffa. Ostaje prava `<table>` na širini,
 * a na telefonu se isti podaci crtaju kao čitljive kartice bez horizontalnog skrola.
 */
import { CONTENT_WIDTH, SECTION_X, THEME10_ANCHORS } from "./constants";
import type { IService } from "@/types";
import {
  THEME10_DEMO_DESKTOP_MASTERS,
  THEME10_DEMO_MASTERS,
  THEME10_DEMO_PRICE_ROWS,
  theme10DemoPriceForMaster,
  type Theme10DemoPriceRow,
} from "./demoCatalog";

export interface Theme10PriceListProps {
  headlineLines: string[];
  body: string;
  services: IService[];
}

function groupByCategory(rows: Theme10DemoPriceRow[]): { group: string; rows: Theme10DemoPriceRow[] }[] {
  const groups = new Map<string, Theme10DemoPriceRow[]>();
  for (const row of rows) {
    const key = row.category;
    const rows = groups.get(key);
    if (rows) rows.push(row);
    else groups.set(key, [row]);
  }
  return [...groups].map(([group, rows]) => ({ group, rows }));
}

export function Theme10PriceList({ headlineLines, body }: Theme10PriceListProps) {
  const groups = groupByCategory(THEME10_DEMO_PRICE_ROWS);

  return (
    <section
      id={THEME10_ANCHORS.prices}
      className="bg-[linear-gradient(140deg,#1a1a19_0%,#26251f_55%,#141413_100%)] py-[clamp(56px,6vw,110px)] text-ash-paper-2"
    >
      <div className={`${CONTENT_WIDTH} ${SECTION_X}`}>
      <div className="mb-[clamp(32px,3.6vw,56px)] grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-end gap-[clamp(24px,3vw,56px)]">
        <div>
          <span className="text-[11px] uppercase tracking-[0.3em] text-ash-gold">
            Cenovnik
          </span>
          <h2 className="mt-3.5 font-cormorant text-[clamp(32px,3.6vw,58px)] font-normal uppercase leading-[1.02] text-ash-paper-2">
            {headlineLines.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </h2>
        </div>
        {body && (
          <p className="max-w-[44ch] text-[15.5px] font-light leading-[1.75] text-[#b9b7b2]">
            {body}
          </p>
        )}
      </div>

      <div className="hidden min-[700px]:block">
        <table className="w-full border-collapse text-[14.5px]">
          <thead>
            <tr>
              <th
                scope="col"
                className="pb-4 text-left text-[11px] font-normal uppercase tracking-[0.28em] text-[#87857f]"
              >
                Usluga
              </th>
              {THEME10_DEMO_DESKTOP_MASTERS.map((master) => (
                <th
                  key={master.id}
                  scope="col"
                  className="w-[18%] pb-4 pl-6 text-right text-[11px] font-normal uppercase tracking-[0.2em] text-[#87857f]"
                >
                  {master.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(({ group, rows }, gi) => (
              <DesktopGroupRows key={group} group={group} rows={rows} first={gi === 0} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="min-[700px]:hidden">
        {groups.map(({ group, rows }, gi) => (
          <section key={group} className={gi === 0 ? "pt-[26px]" : "pt-[34px]"}>
            <h3 className="border-b border-ash-gold/35 pb-3 text-[11px] font-normal uppercase tracking-[0.3em] text-ash-gold">
              {group}
            </h3>
            {rows.map((row) => (
              <MobilePriceRow key={row.name} row={row} />
            ))}
          </section>
        ))}
      </div>
      </div>
    </section>
  );
}

function DesktopGroupRows({
  group,
  rows,
  first,
}: {
  group: string;
  rows: Theme10DemoPriceRow[];
  first: boolean;
}) {
  return (
    <>
      <tr>
        <th
          scope="colgroup"
          colSpan={4}
          className={`border-b border-ash-gold/35 pb-3 text-left text-[11px] font-normal uppercase tracking-[0.3em] text-ash-gold ${
            first ? "pt-[26px]" : "pt-[34px]"
          }`}
        >
          {group}
        </th>
      </tr>
      {rows.map((row) => {
        return (
          <tr key={row.name} className="border-b border-ash-paper-2/10">
            <td className="py-[18px]">
              <div className="font-cormorant text-[21px] leading-[1.3]">{row.name}</div>
              {row.description && (
                <div className="mt-[5px] text-[12.5px] font-light leading-normal text-[#87857f]">
                  {row.description}
                </div>
              )}
            </td>
            {THEME10_DEMO_DESKTOP_MASTERS.map((master) => {
              const price = theme10DemoPriceForMaster(row, master.id);
              return (
                <td
                  key={master.id}
                  className={`py-[18px] pl-6 text-right align-top tabular-nums whitespace-nowrap ${
                    price ? "" : "text-[#5c5a56]"
                  }`}
                >
                  {price ?? "—"}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

function MobilePriceRow({ row }: { row: Theme10DemoPriceRow }) {
  return (
    <article className="border-b border-ash-paper-2/10 py-[18px]">
      <div className="font-cormorant text-[21px] leading-[1.3]">{row.name}</div>
      {row.description && (
        <div className="mt-[5px] text-[12.5px] font-light leading-normal text-[#87857f]">
          {row.description}
        </div>
      )}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {THEME10_DEMO_MASTERS.map((master) => {
          const price = theme10DemoPriceForMaster(row, master.id);
          return (
            <div key={master.id} className="min-w-0 border-l border-ash-paper-2/15 pl-2.5 first:border-l-0 first:pl-0">
              <div className="text-[9px] uppercase tracking-[0.15em] text-[#87857f]">
                {master.label}
              </div>
              <div
                className={`mt-1 text-[11px] leading-snug tabular-nums ${
                  price ? "text-ash-paper-2" : "text-[#5c5a56]"
                }`}
              >
                {price ?? "—"}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
