import Link from "next/link";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

interface Theme1FooterProps {
  salonName?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  newsletterEmail?: string;
}

export function Theme1Footer({ salonName, instagram, facebook, tiktok }: Theme1FooterProps) {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-lg font-bold text-(--secondary-color) mb-4">{salonName ?? "Salon"}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Vaš profesionalni beauty salon. Rezervišite termin online i doživite pravo lepotno iskustvo.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-gray-100">Brze veze</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/" className="hover:text-white transition">Naslovna</Link></li>
              <li><Link href="/usluge" className="hover:text-white transition">Usluge</Link></li>
              <li><Link href="/termini" className="hover:text-white transition">Zakaži termin</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-gray-100">Pratite nas</h4>
            <div className="flex gap-4">
              {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition text-sm">Instagram</a>}
              {facebook && <a href={facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition text-sm">Facebook</a>}
              {tiktok && <a href={tiktok} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition text-sm">TikTok</a>}
            </div>
            <div className="mt-6">
              <Link href="/termini" className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--secondary-color) text-white text-sm font-semibold rounded-full hover:bg-(--primary-color) transition">
                <CalendarDaysIcon className="size-4" />
                Zakaži termin
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/10 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} {salonName}. Powered by Marysoll.
        </div>
      </div>
    </footer>
  );
}
