import Link from "next/link";
import { Suspense } from "react";

function ReasonBanner() {
  return null;
}

export default function NewsletterVerifyFailed() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Verifikacija nije uspela
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Link za potvrdu je istekao ili je već iskorišćen. Pokušajte ponovo da se pretplatite.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition"
        >
          Nazad na početnu
        </Link>
      </div>
    </div>
  );
}
