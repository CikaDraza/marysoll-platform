import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="text-center p-8 max-w-md">
        <div className="text-6xl mb-5">💅</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Stranica nije pronađena
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Tražena stranica ne postoji ili salon još uvek nije aktivan.
        </p>
        <Link href="/" className="text-purple-600 hover:underline text-sm">
          ← Nazad na početnu
        </Link>
      </div>
    </div>
  );
}
