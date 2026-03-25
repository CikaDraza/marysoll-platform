import Link from "next/link";

interface Props {
  instagramUrl: string;
}

export function Theme1GallerySection({ instagramUrl }: Props) {
  return (
    <section className="py-16 lg:py-24 mx-auto max-w-4xl px-4 text-center">
      <h2 className="text-3xl lg:text-5xl font-bold text-(--primary-color) mb-4">
        Galerija
      </h2>
      <p className="text-gray-600 text-sm mb-8">
        Pogledajte naš rad na Instagramu
      </p>
      <Link
        href={instagramUrl}
        target="_blank"
        className="inline-block px-8 py-3 bg-(--secondary-color) text-white font-semibold rounded-full hover:bg-(--primary-color) transition shadow-lg"
      >
        Pogledaj galeriju →
      </Link>
    </section>
  );
}
