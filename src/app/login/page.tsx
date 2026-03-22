import MiniLoader from "@/components/ai/MiniLoader";
import LoginForm from "@/components/auth/LoginForm";
import { SearchParamsReader } from "@/components/renderingError/SearchParamsReader";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <Suspense fallback={<MiniLoader />}>
        <SearchParamsReader />
        <LoginForm />
      </Suspense>
    </div>
  );
}
