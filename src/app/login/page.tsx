import { Suspense } from "react";
import MiniLoader from "@/components/ai/MiniLoader";
import LoginForm from "@/components/auth/LoginForm";
import { SearchParamsReader } from "@/components/renderingError/SearchParamsReader";
import AuthLayout from "@/layout/AuthLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <AuthLayout
      heading="Dobro došli nazad"
      subheading="Prijavite se na vaš Marysoll nalog"
      footerText="Nemate nalog?"
      footerLinkText="Registrujte salon"
      footerLinkHref="/register"
    >
      <Suspense fallback={<MiniLoader />}>
        <SearchParamsReader />
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
