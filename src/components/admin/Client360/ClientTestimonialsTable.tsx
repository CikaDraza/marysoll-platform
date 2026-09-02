import Link from "next/link";
import type { ClientOverview } from "@/types/client-overview";
import { ClientOverviewSection } from "./ClientOverviewSection";

export function ClientTestimonialsTable({
  testimonials,
}: {
  testimonials: ClientOverview["testimonials"];
}) {
  return (
    <ClientOverviewSection title={`Preporuke (${testimonials.totalCount})`}>
      {!testimonials.items.length ? <p className="text-sm text-gray-500">Nema preporuka.</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr><th className="px-4 py-3">Datum</th><th className="px-4 py-3">Odgovor klijenta</th><th className="px-4 py-3">Odgovor salona</th><th className="px-4 py-3 text-right">Ocena</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
              {testimonials.items.map((testimonial) => (
                <tr key={testimonial.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(testimonial.createdAt).toLocaleDateString("sr-RS")}</td>
                  <td className="min-w-60 px-4 py-3 text-gray-800 dark:text-gray-200">{testimonial.comment}</td>
                  <td className="min-w-60 px-4 py-3 text-gray-600 dark:text-gray-300">{testimonial.adminReply || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-amber-500">{testimonial.rating} / 5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Link href="/dashboard?tab=preporuke" className="mt-3 inline-block text-sm font-bold text-violet-600 hover:underline">Upravljaj preporukama →</Link>
    </ClientOverviewSection>
  );
}
