/**
 * Theme10PriceList — `#cene`, prikaz `services.catalog` bloka kao cenovnik.
 *
 * Renderuje se iz usluga salona, grupisanih po kategoriji (redom prve pojave).
 * Dizajn ima kolonu cene po majstoru; booking domen još nema cene po
 * zaposlenom, pa je ovde jedna kolona. Ostaje prava `<table>` (a11y).
 */
import type { IService } from "@/types";
import { SECTION_X, THEME10_ANCHORS } from "./constants";
import { servicePriceLabel } from "./format";

export interface Theme10PriceListProps {
  headlineLines: string[];
  body: string;
  services: IService[];
}

function groupByCategory(services: IService[]): { group: string; rows: IService[] }[] {
  const groups = new Map<string, IService[]>();
  for (const s of services) {
    const key = s.category?.trim() || "Usluge";
    const rows = groups.get(key);
    if (rows) rows.push(s);
    else groups.set(key, [s]);
  }
  return [...groups].map(([group, rows]) => ({ group, rows }));
}

export function Theme10PriceList({ headlineLines, body, services }: Theme10PriceListProps) {
  const groups = groupByCategory(services);

  return (
    <section
      id={THEME10_ANCHORS.prices}
      className={`bg-[linear-gradient(140deg,#1a1a19_0%,#26251f_55%,#141413_100%)] py-[clamp(56px,6vw,110px)] text-ash-paper-2 ${SECTION_X}`}
    >
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[14.5px]">
          <thead>
            <tr>
              <th
                scope="col"
                className="pb-4 text-left text-[11px] font-normal uppercase tracking-[0.28em] text-[#87857f]"
              >
                Usluga
              </th>
              <th
                scope="col"
                className="w-[160px] pb-4 pl-6 text-right text-[11px] font-normal uppercase tracking-[0.2em] text-[#87857f]"
              >
                Cena
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ group, rows }, gi) => (
              <GroupRows key={group} group={group} rows={rows} first={gi === 0} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GroupRows({
  group,
  rows,
  first,
}: {
  group: string;
  rows: IService[];
  first: boolean;
}) {
  return (
    <>
      <tr>
        <th
          scope="colgroup"
          colSpan={2}
          className={`border-b border-ash-gold/35 pb-3 text-left text-[11px] font-normal uppercase tracking-[0.3em] text-ash-gold ${
            first ? "pt-[26px]" : "pt-[34px]"
          }`}
        >
          {group}
        </th>
      </tr>
      {rows.map((s) => {
        const price = servicePriceLabel(s);
        return (
          <tr key={s._id} className="border-b border-ash-paper-2/10">
            <td className="py-[18px]">
              <div className="font-cormorant text-[21px] leading-[1.3]">{s.name}</div>
              {s.description && (
                <div className="mt-[5px] text-[12.5px] font-light leading-normal text-[#87857f]">
                  {s.description}
                </div>
              )}
            </td>
            <td
              className={`py-[18px] pl-6 text-right align-top tabular-nums whitespace-nowrap ${
                price ? "" : "text-[#5c5a56]"
              }`}
            >
              {price ?? "—"}
            </td>
          </tr>
        );
      })}
    </>
  );
}
