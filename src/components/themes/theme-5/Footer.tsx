import type { mapCMS } from "@/lib/CMSMapper/mapCMS";

type FooterData = ReturnType<typeof mapCMS>["footer"];

export function Theme5Footer({ data }: { data: FooterData }) {
  return (
    <footer className="bg-[#111] text-white py-10 text-center">
      <div>{data?.logo}</div>

      <div className="mt-4 text-sm opacity-60">{data?.copyright}</div>
    </footer>
  );
}
