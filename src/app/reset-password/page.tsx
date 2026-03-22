import MiniLoader from "@/components/ai/MiniLoader";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { SearchParamsReader } from "@/components/renderingError/SearchParamsReader";
import { Suspense } from "react";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <Suspense fallback={<MiniLoader text="Proveravamo link..." />}>
        <SearchParamsReader />
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
