import Link from "next/link";

export default function TenantNewsletterVerifySuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Pretplata potvrđena!
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Uspešno ste se pretplatili na newsletter. Uskoro ćete početi da primate naše novosti i ponude.
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
