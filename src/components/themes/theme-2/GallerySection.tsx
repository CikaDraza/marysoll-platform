import Link from "next/link";

interface Props { instagramUrl: string }

export function Theme2GallerySection({ instagramUrl }: Props) {
  return (
    <section className="bg-gray-950 py-24 px-6 text-center">
      <div className="w-12 h-0.5 bg-yellow-500 mx-auto mb-4" />
      <h2 className="text-3xl font-black text-white mb-4">Galerija radova</h2>
      <p className="text-gray-600 text-sm mb-8 max-w-sm mx-auto">Pogledajte naš rad na Instagramu</p>
      <Link href={instagramUrl} target="_blank"
        className="inline-block px-10 py-4 bg-yellow-500 text-gray-950 font-black text-sm tracking-widest rounded hover:bg-yellow-400 transition">
        ISTRAŽI GALERIJU
      </Link>
    </section>
  );
}
