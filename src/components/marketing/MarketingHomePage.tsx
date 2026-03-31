import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Marysoll — Platforma za beauty salone",
  description: "Sve što vam treba za uspešan beauty salon na jednom mestu.",
};

/**
 * Marketing landing page — marysoll.com
 * Prikazuje se samo na glavnoj domeni.
 */
export function MarketingHomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="text-center py-24 px-4">
        <span>Ne zaboravi ipak!</span>
        <h2 className="text-9xl! font-bold text-gray-900 leading-tight heading-font">
          Platforma za <span className="text-purple-600">male biznise</span>
        </h2>
        <p className="mt-6 text-md text-gray-500 max-w-2xl mx-auto">
          Zakazivanje, klijenti, newsletter, tim asistenta — sve na jednom
          mestu. Tvoj biznis, tvoj salon, tvoj domen.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <Link
            href="/register"
            className="bg-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-purple-700 transition"
          >
            Registruj salon
          </Link>
          <Link
            href="#features"
            className="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
          >
            Saznaj više
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 relative bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-4xl! font-bold text-center text-gray-800 mb-12">
            Sve što tvom salonu treba
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "📅",
                title: "Online zakazivanje",
                desc: "Klijenti zakazuju 24/7. Automatska potvrda i podsetnici.",
              },
              {
                icon: "👩",
                title: "Mary Asistent",
                desc: "Odgovara na pitanja klijenata, predlaže termine, generiše sadržaj.",
              },
              {
                icon: "📧",
                title: "Newsletter kampanje",
                desc: "Mary ti pomaže u kreiranju landing stranice i email kampanje za tvoje klijente.",
              },
              {
                icon: "🌐",
                title: "Tvoj domen",
                desc: "Salon dobija subdomen besplatno. Kasnije možeš da povežeš svoj domen.",
              },
              {
                icon: "📊",
                title: "Analitika",
                desc: "Prati rast klijenata, prihode, popunjenost termina.",
              },
              {
                icon: "⭐",
                title: "Recenzije klijenata",
                desc: "Sakupi i prikaži utiske. Admin odobrava pre objave.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-xl p-6 relative isolate "
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-800 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="py-40 text-center px-4 relative isolate">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <svg
            aria-hidden="true"
            className="absolute top-0 left-[max(50%,25rem)] h-256 w-512 -translate-x-1/2 mask-[radial-gradient(64rem_64rem_at_top,white,transparent)] stroke-gray-200"
          >
            <defs>
              <pattern
                x="50%"
                y={-1}
                id="e813992c-7d03-4cc4-a2bd-151760b470a0"
                width={200}
                height={200}
                patternUnits="userSpaceOnUse"
              >
                <path d="M100 200V.5M.5 .5H200" fill="none" />
              </pattern>
            </defs>
            <svg x="50%" y={-1} className="overflow-visible fill-gray-50">
              <path
                d="M-100.5 0h201v201h-201Z M699.5 0h201v201h-201Z M499.5 400h201v201h-201Z M-300.5 600h201v201h-201Z"
                strokeWidth={0}
              />
            </svg>
            <rect
              fill="url(#e813992c-7d03-4cc4-a2bd-151760b470a0)"
              width="100%"
              height="100%"
              strokeWidth={0}
            />
          </svg>
        </div>
        <h2 className="text-4xl! font-bold text-gray-800 mb-4">
          Počni besplatno
        </h2>
        <p className="text-gray-500 mb-8">
          Besplatan plan za uvek. Plaća se samo kada rasteš.
        </p>
        <Link
          href="/register"
          className="bg-purple-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-purple-700 transition"
        >
          Kreiraj salon →
        </Link>
      </section>

      {/* ============================================
          FOOTER
      ============================================ */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-2xl">
              <Link href="/" className="flex gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  M
                </div>
                <div className="flex flex-col">
                  <span className="text-md/9 text-white heading-font">
                    MarySoll
                  </span>
                  <small className="text-[0.5rem] text-white -mt-1">
                    je napravila nešto posebno
                  </small>
                </div>
              </Link>
            </div>

            <div className="flex gap-8 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white transition">
                Privatnost
              </Link>
              <Link href="/terms" className="hover:text-white transition">
                Uslovi
              </Link>
              <Link href="/contact" className="hover:text-white transition">
                Kontakt
              </Link>
            </div>

            <div className="flex gap-4">
              {["📧", "💬", "📸"].map((emoji, i) => (
                <Link
                  key={i}
                  href="#"
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-violet-600 transition"
                >
                  {emoji}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} MarySoll. Tvoja drugarica iz salona. 💜
          </div>
        </div>
      </footer>
    </div>
  );
}
