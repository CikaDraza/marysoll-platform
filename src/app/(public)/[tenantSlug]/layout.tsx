import { CookiesModal } from "@/components/client/CookiesModal";

interface Props {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantLayout({ children, params }: Props) {
  const { tenantSlug } = await params;

  return (
    <>
      {children}
      <CookiesModal tenantSlug={tenantSlug} />
    </>
  );
}
