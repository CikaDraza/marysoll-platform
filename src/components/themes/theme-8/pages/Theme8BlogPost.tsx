/**
 * Theme8BlogPost — light Y2K chrome for a blog/campaign detail page: a graffiti
 * "back to blog" bar above the CMS-driven body (which keeps its own layout).
 * The surrounding Y2K header/footer/wall come from TenantShellClient. theme-8 only.
 */
import Link from "next/link";
import type { ReactNode } from "react";

export function Theme8BlogPost({
  tenantSlug,
  children,
}: {
  tenantSlug?: string;
  children: ReactNode;
}) {
  const base = tenantSlug ? `/${tenantSlug}` : "";
  return (
    <div className="relative">
      <div className="max-w-[1100px] mx-auto px-5 pt-6">
        <Link
          href={`${base}/blogs`}
          className="inline-flex items-center gap-2 rounded-full border-[3px] border-y2k-ink bg-white px-5 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-y2k-ink shadow-[4px_4px_0_#8B16C9] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
        >
          ← Nazad na blog
        </Link>
      </div>
      {children}
    </div>
  );
}
