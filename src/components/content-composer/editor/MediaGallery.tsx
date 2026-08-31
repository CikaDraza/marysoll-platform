"use client";

import { useAuth } from "@/hooks/useAuth";
import { useCloudinaryImages } from "@/hooks/useCloudinaryImages";
import { useCloudinaryVideos } from "@/hooks/useCloudinaryVideos";
import type { ContentMediaKind } from "@/lib/content/media/authoring";

/**
 * Već otpremljeni materijal ovog salona.
 *
 * Listanje je tenant-scoped na serveru (`resolveCloudinaryListFolder`), pa
 * galerija nikada ne pokazuje tuđe fajlove. Dokumenti se ne listaju — za njih
 * provider nema odgovarajući ugovor, pa za `file` galerije nema.
 */
export function MediaGallery({
  kind,
  selectedSrc,
  onSelect,
}: {
  kind: ContentMediaKind;
  /** Trenutno izabrana adresa — galerija je ističe umesto da ćuti. */
  selectedSrc?: string;
  onSelect: (src: string, fileName?: string) => void;
}) {
  const { token } = useAuth();
  const images = useCloudinaryImages(kind === "image" ? token : null);
  const videos = useCloudinaryVideos(kind === "video" ? token : null);

  const query = kind === "video" ? videos : images;
  const items =
    kind === "video"
      ? (videos.data?.videos ?? [])
      : (images.data?.images ?? []);

  if (kind === "file") {
    return (
      <p className="text-xs text-gray-500">
        Dokumenti se ne prikazuju u galeriji — otpremite fajl ili unesite adresu.
      </p>
    );
  }

  if (query.isLoading) {
    return <p className="text-xs text-gray-500">Učitavanje…</p>;
  }

  if (query.isError) {
    return (
      <p className="text-xs text-red-600">
        Galerija trenutno nije dostupna. Otpremite fajl ili unesite adresu.
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-xs text-gray-500">
        Još nema otpremljenog materijala. Prvi fajl dodajte kroz „Otpremi”.
      </p>
    );
  }

  return (
    <ul className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
      {items.map((item) => {
        const active = item.secure_url === selectedSrc;

        return (
        <li key={item.public_id}>
          <button
            type="button"
            onClick={() => onSelect(item.secure_url, item.original_filename)}
            title={item.original_filename}
            aria-pressed={active}
            className={`block w-full overflow-hidden rounded-md transition ${
              active
                ? "border-2 border-violet-600 ring-2 ring-violet-200 dark:ring-violet-900"
                : "border border-gray-200 hover:border-violet-500 dark:border-gray-700"
            }`}
          >
            {kind === "video" ? (
              <span className="flex aspect-square items-center justify-center bg-gray-100 text-[10px] font-semibold text-gray-500 dark:bg-gray-800">
                VIDEO
              </span>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={item.secure_url}
                alt={item.original_filename}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            )}
          </button>
        </li>
        );
      })}
    </ul>
  );
}
