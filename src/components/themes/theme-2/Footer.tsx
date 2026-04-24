import Link from "next/link";

interface Props {
  salonName?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

export function Theme2Footer({
  salonName,
  instagram,
  facebook,
  tiktok,
}: Props) {
  return (
    <footer className="bg-gray-950">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <h3 className="text-(--primary-color) font-bold text-xl tracking-widest uppercase mb-4">
              {salonName}
            </h3>
            <p className="text-gray-500 text-sm">
              Premium beauty tretmani. Profesionalni pristup. Vidljivi
              rezultati.
            </p>
          </div>
          <div>
            <h4 className="text-gray-200 font-semibold mb-4 tracking-wide uppercase text-xs">
              Navigacija
            </h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <Link
                  href="/"
                  className="hover:text-(--primary-color) transition"
                >
                  Naslovna
                </Link>
              </li>
              <li>
                <Link
                  href="/usluge"
                  className="hover:text-(--primary-color) transition"
                >
                  Usluge
                </Link>
              </li>
              <li>
                <Link
                  href="/termini"
                  className="hover:text-(--primary-color) transition"
                >
                  Zakaži
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-gray-200 font-semibold mb-4 tracking-wide uppercase text-xs">
              Pratite nas
            </h4>
            <div className="flex gap-4">
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  className="text-gray-500 hover:text-yellow-400 transition text-sm"
                >
                  IG
                </a>
              )}
              {facebook && (
                <a
                  href={facebook}
                  target="_blank"
                  className="text-gray-500 hover:text-yellow-400 transition text-sm"
                >
                  FB
                </a>
              )}
              {tiktok && (
                <a
                  href={tiktok}
                  target="_blank"
                  className="text-gray-500 hover:text-yellow-400 transition text-sm"
                >
                  TT
                </a>
              )}
            </div>
            <Link
              href="/termini"
              className="mt-6 inline-block px-6 py-2.5 bg-yellow-500 text-gray-950 text-sm font-bold rounded hover:bg-yellow-400 transition"
            >
              Zakaži termin
            </Link>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-yellow-900/20 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} {salonName} · Powered by Marysoll
        </div>
      </div>
    </footer>
  );
}
