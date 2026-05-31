import type { mapCMS } from "@/lib/CMSMapper/mapCMS";

type TestimonialsData = ReturnType<typeof mapCMS>["testimonials"];

export function Theme5Testimonials({ data, tenantSlug: _tenantSlug }: { data: TestimonialsData; tenantSlug?: string }) {
  return (
    <section className="py-16 bg-white text-center max-w-3xl mx-auto">
      {data?.items?.map((t, i) => (
        <div key={i} className="mb-8">
          <p className="italic">&ldquo;{t.quote}&rdquo;</p>
          <div className="mt-4 text-sm font-medium">{t.author}</div>
        </div>
      ))}
    </section>
  );
}
