import type { mapCMS } from "@/lib/CMSMapper/mapCMS";

type StatsData = ReturnType<typeof mapCMS>["about"];

export function Theme5Stats({ data }: { data: StatsData }) {
  return (
    <section className="py-16 bg-[#fafafa] text-center">
      <div className="flex justify-center gap-12">
        {data?.items?.map((s) => (
          <div key={s.label}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
