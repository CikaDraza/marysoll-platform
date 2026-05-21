import { Suspense } from "react";
import MiniLoader from "@/components/ai/MiniLoader";
import RegisterForm from "@/components/auth/RegisterForm";
import { SearchParamsReader } from "@/components/renderingError/SearchParamsReader";
import AuthLayout from "@/layout/AuthLayout";

export default function RegisterPage() {
  return (
    <AuthLayout
      heading="Kreirajte vaš salon"
      subheading="Počnite besplatno — 30 dana trial perioda"
      footerText="Već imate nalog?"
      footerLinkText="Prijavite se"
      footerLinkHref="/login"
    >
      <Suspense fallback={<MiniLoader text="Proveravamo link..." />}>
        <SearchParamsReader />
        <RegisterForm />
      </Suspense>
    </AuthLayout>
  );
}
