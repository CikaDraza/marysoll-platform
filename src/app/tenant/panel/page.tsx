import type { Metadata } from "next";
import { Suspense } from "react";
import ClientPanelPage from "./ClientPanelPage";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function TenantPanelPage() {
  return (
    <Suspense>
      <ClientPanelPage />
    </Suspense>
  );
}
