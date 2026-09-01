"use client";
/**
 * BookingIntakeSection — „Kako želite da izgleda?"
 *
 * Prikazuje se samo za usluge sa `intakeEnabled` (nokti da, šminka ne). Sve je
 * opciono i booking se nikad ne blokira — ali „Preskoči" stoji diskretno dole,
 * jer je cilj da klijentkinja ipak odgovori.
 *
 * Zašto je ovo važnije od galerije: Marija vidi zahtev PRE nego što potvrdi
 * termin, pa fotografija može da joj kaže „ovo nije dva sata, ovo je tri".
 */
import { useRef, useState } from "react";
import Image from "next/image";
import { useBookingContext } from "./BookingProvider";

export function BookingIntakeSection() {
  const {
    selectedService,
    intakeNote,
    setIntakeNote,
    intakeReferenceUrl,
    setIntakeReferenceUrl,
    intakeImage,
    uploadIntakeImage,
    removeIntakeImage,
    intakeUploading,
    intakeError,
  } = useBookingContext();

  const [skipped, setSkipped] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!selectedService?.intakeEnabled) return null;

  const hasContent = Boolean(intakeImage || intakeNote || intakeReferenceUrl);
  if (skipped && !hasContent) {
    return (
      <div className="mt-3 text-right">
        <button
          type="button"
          onClick={() => setSkipped(false)}
          className="text-xs text-gray-400 underline hover:text-gray-600"
        >
          Ipak dodaj fotografiju ili opis
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-800">
        Kako želite da izgleda?
      </p>
      <p className="mt-0.5 text-xs text-gray-500">
        Pošaljite fotografiju ili nam ukratko opišite šta želite.
      </p>

      {/* Fotografija */}
      <div className="mt-3">
        {intakeImage ? (
          <div className="flex items-start gap-3">
            <Image
              src={intakeImage.url}
              alt="Vaša referentna fotografija"
              width={96}
              height={96}
              className="h-24 w-24 rounded-lg object-cover border border-gray-200"
              unoptimized
            />
            <button
              type="button"
              onClick={removeIntakeImage}
              className="text-xs text-gray-500 underline hover:text-red-600"
            >
              Ukloni fotografiju
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              disabled={intakeUploading}
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:border-(--primary-color) disabled:opacity-60 transition"
            >
              {intakeUploading ? "Otpremanje…" : "Dodaj fotografiju"}
            </button>
            <p className="mt-1 text-[11px] text-gray-400">
              JPG / PNG / WEBP · do 5 MB
            </p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Reset da bi izbor ISTOG fajla posle greške ponovo okinuo change.
            e.target.value = "";
            if (file) uploadIntakeImage(file);
          }}
        />
        {intakeError && (
          <p className="mt-1 text-xs font-semibold text-red-600">
            {intakeError}
          </p>
        )}
      </div>

      <div className="mt-3">
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Link ka inspiraciji
        </label>
        <input
          type="url"
          inputMode="url"
          value={intakeReferenceUrl}
          onChange={(e) => setIntakeReferenceUrl(e.target.value)}
          placeholder="https://..."
          className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-(--primary-color)/80"
        />
      </div>

      <div className="mt-3">
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Opis
        </label>
        <textarea
          rows={3}
          value={intakeNote}
          onChange={(e) => setIntakeNote(e.target.value)}
          placeholder="Opišite dizajn, boju ili druge želje..."
          className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-(--primary-color)/80"
        />
      </div>

      {!hasContent && (
        <div className="mt-3 text-right">
          <button
            type="button"
            onClick={() => setSkipped(true)}
            className="text-xs text-gray-400 underline hover:text-gray-600"
          >
            Preskoči
          </button>
        </div>
      )}
    </div>
  );
}
