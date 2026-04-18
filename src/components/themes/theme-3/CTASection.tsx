import Link from "next/link";

export function Theme3CTA({ tenantSlug }: { tenantSlug?: string }) {
  return (
    <section className="bg-[#E7B8A4] py-44 text-center text-white">
      <h2 className="text-5xl lg:text-6xl font-serif mb-6">
        Spremna za promenu?
      </h2>

      <Link
        href={`${tenantSlug ? `/${tenantSlug}` : ""}/termini`}
        className="px-8 py-3 bg-white text-[#2B2B2B] rounded-full font-semibold"
      >
        Zakaži termin
      </Link>
    </section>
  );
}
