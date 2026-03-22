import Link from "next/link";

interface Props { instagramUrl: string }

export function Theme3GallerySection({ instagramUrl }: Props) {
  return (
    <section className="bg-[#F5EEE8] py-20 lg:py-28 px-6 text-center">
      <p className="text-[#C9A990] text-xs font-semibold tracking-[0.25em] uppercase mb-3">galerija</p>
      <h2 className="text-3xl font-light text-[#3D2B1F] mb-4">Naši radovi</h2>
      <p className="text-[#9E7E6E] text-sm mb-8 max-w-sm mx-auto">Pogledajte kolekciju naših slika i radova na Instagramu</p>
      <Link href={instagramUrl} target="_blank"
        className="inline-block px-8 py-3.5 border border-[#C9A990] text-[#C9A990] text-sm font-medium rounded-full hover:bg-[#C9A990] hover:text-white transition">
        Istraži galeriju →
      </Link>
    </section>
  );
}
