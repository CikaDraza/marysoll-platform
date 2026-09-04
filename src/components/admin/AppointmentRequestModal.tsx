"use client";
/**
 * AppointmentRequestModal — „Zahtev klijentkinje" uz konkretan termin.
 *
 * Fotografija bez konteksta brzo postane beskorisna, pa se uvek prikazuje uz
 * uslugu, varijantu, procenu i termin na koji se odnosi. Cilj nije galerija —
 * cilj je da salon vidi zahtev PRE nego što potvrdi termin, jer slika ume da
 * kaže „ovo nije dva sata, ovo je tri".
 */
import Image from "next/image";
import { formatPriceToString } from "@/helpers/formatPrice";
import type { IAppointment } from "@/types";

interface Props {
  appointment: IAppointment;
  onClose: () => void;
}

/** Cloudinary transformacija — lista i modal ne vuku original od 5 MB. */
export function cloudinaryThumb(url: string, width: number): string {
  return url.replace("/upload/", `/upload/c_limit,w_${width},q_auto,f_auto/`);
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="mt-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
        {value}
      </p>
    </div>
  );
}

export function AppointmentRequestModal({ appointment, onClose }: Props) {
  const request = appointment.request;
  const image = request?.attachments?.[0];
  const price = appointment.services?.[0]?.price;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Zahtev klijentkinje"
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col border border-gray-100 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="font-bold text-gray-800 dark:text-white">
              Zahtev klijentkinje
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {appointment.clientName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Zatvori"
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-xl transition"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {image && (
            <a
              href={image.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
            >
              <Image
                src={cloudinaryThumb(image.url, 800)}
                alt="Fotografija koju je klijentkinja poslala"
                width={image.width ?? 800}
                height={image.height ?? 800}
                className="w-full h-auto object-cover"
                unoptimized
              />
            </a>
          )}

          <Row label="Opis" value={request?.note} />

          {request?.referenceUrl && (
            <div className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                Referentni link
              </p>
              <a
                href={request.referenceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-0.5 block text-sm text-violet-600 dark:text-violet-400 underline break-all"
              >
                {request.referenceUrl}
              </a>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Row label="Usluga" value={appointment.serviceName} />
            {typeof price === "number" && price > 0 && (
              <Row
                label="Procena pri zakazivanju"
                value={`${formatPriceToString(price)} RSD`}
              />
            )}
            <Row
              label="Termin"
              value={`${appointment.date} · ${appointment.time} (${appointment.duration} min)`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** true kada termin nosi bilo šta od zahteva. */
export function hasRequest(a: IAppointment): boolean {
  const r = a.request;
  return Boolean(r && (r.note || r.referenceUrl || r.attachments?.length));
}

/** true kada zahtev sadrži fotografiju (jači signal u listi). */
export function hasRequestImage(a: IAppointment): boolean {
  return Boolean(a.request?.attachments?.length);
}
