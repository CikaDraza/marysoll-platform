import MiniLoader from "@/components/ai/MiniLoader";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { SearchParamsReader } from "@/components/renderingError/SearchParamsReader";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <Suspense fallback={<MiniLoader text="Proveravamo link..." />}>
        <SearchParamsReader />
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
