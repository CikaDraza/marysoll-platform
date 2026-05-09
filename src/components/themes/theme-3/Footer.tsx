import Link from "next/link";

interface Props {
  salonName?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  tenantSlug?: string;
}

export function Theme3Footer({
  salonName,
  instagram,
  facebook,
  tiktok,
  tenantSlug,
}: Props) {
  const base = tenantSlug ? `/${tenantSlug}` : "";
  return (
    <footer className="bg-[#F2EDE8] border-t border-[#E0D5CC]">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <h3 className="text-[#5C4033] font-semibold text-base mb-3">
              {salonName}
            </h3>
            <p className="text-[#9E7E6E] text-sm leading-relaxed">
              Vaš profesionalni beauty salon sa ljubavlju prema lepoti i
              dobrobiti.
            </p>
          </div>
          <div>
            <h4 className="text-[#7C6A5E] text-xs font-semibold tracking-widest uppercase mb-4">
              Navigacija
            </h4>
            <ul className="space-y-2 text-sm text-[#9E7E6E]">
              <li>
                <Link
                  href={base + "/"}
                  className="hover:text-[#5C4033] transition"
                >
                  Naslovna
                </Link>
              </li>
              <li>
                <Link
                  href={base + "/usluge"}
                  className="hover:text-[#5C4033] transition"
                >
                  Usluge
                </Link>
              </li>
              <li>
                <Link
                  href={base + "/termini"}
                  className="hover:text-[#5C4033] transition"
                >
                  Zakaži termin
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#7C6A5E] text-xs font-semibold tracking-widest uppercase mb-4">
              Pratite nas
            </h4>
            <div className="flex gap-4 mb-5">
              <Link
                href={instagram || "https://www.instagram.com/"}
                target="_blank"
                className="text-[#9E7E6E] hover:text-[#5C4033] transition text-sm"
              >
                Instagram
              </Link>
              <Link
                href={facebook || "https://www.facebook.com/"}
                target="_blank"
                className="text-[#9E7E6E] hover:text-[#5C4033] transition text-sm"
              >
                Facebook
              </Link>
              <Link
                href={tiktok || "https://www.tiktok.com/"}
                target="_blank"
                className="text-[#9E7E6E] hover:text-[#5C4033] transition text-sm"
              >
                TikTok
              </Link>
            </div>
            <Link
              href={base + "/termini"}
              className="inline-block px-6 py-2.5 bg-[#C9A990] text-white text-sm font-medium rounded-full hover:bg-[#B8957A] transition"
            >
              Zakaži termin
            </Link>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-[#E0D5CC] text-center text-xs text-[#B8A898]">
          © {new Date().getFullYear()} {salonName} · Powered by Marysoll
        </div>
      </div>
    </footer>
  );
}
