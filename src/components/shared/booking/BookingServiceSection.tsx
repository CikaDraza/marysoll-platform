"use client";
/** BookingServiceSection — izbor usluge + varijante/stavki paketa + dodaci
 *  + zbir cene/trajanja.
 *  Stanje čita iz BookingProvider konteksta — bez prop drilling-a. */
import {
  formatServicePrice,
  PRICE_ON_REQUEST_LABEL,
} from "@/helpers/formatPrice";
import { useBookingContext } from "./BookingProvider";

export function BookingServiceSection() {
  const {
    services,
    selectedServiceId,
    setSelectedServiceId,
    selectedVariant,
    setSelectedVariant,
    selectedExtras,
    setSelectedExtras,
    selectedService,
    totalDuration,
    priceLines,
    totalPriceLabel,
  } = useBookingContext();

  return (
    <>
  {/* Service */}
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-2">
      Usluga *
    </label>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {services.map((s) => (
        <label
          key={s._id}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
            selectedServiceId === s._id
              ? "border-(--primary-color) bg-(--primary-color)/10"
              : "border-gray-200 hover:border-(--primary-color)/20 bg-gray-50"
          }`}
        >
          <input
            type="radio"
            name="service"
            value={s._id}
            checked={selectedServiceId === s._id}
            // Varijantu i dodatke čisti BookingProvider, na svaku promenu
            // usluge — ne samo na klik ovde.
            onChange={() => setSelectedServiceId(s._id)}
            className="sr-only"
          />
          <span
            className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
              selectedServiceId === s._id
                ? "border-(--primary-color) bg-(--primary-color)"
                : "border-gray-300 bg-white"
            }`}
          />
          <span className="text-sm font-medium text-gray-800">
            {s.name}
          </span>
        </label>
      ))}
    </div>

    {/* Variants */}
    {selectedService?.type === "variant" &&
      selectedService.variants &&
      selectedService.variants.length > 0 && (
        <div className="mt-3">
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Varijanta *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {selectedService.variants.map((v, idx) => (
              <label
                key={idx}
                className={`flex items-start p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedVariant === v.name
                    ? "border-(--primary-color) bg-(--primary-color)/10"
                    : "border-gray-200 hover:border-(--primary-color)/20 bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="variant"
                  value={v.name}
                  checked={selectedVariant === v.name}
                  onChange={() => setSelectedVariant(v.name)}
                  className="sr-only"
                />
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {v.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatServicePrice(v.price, v.priceMode)}
                    {v.duration ? ` • ${v.duration} min` : ""}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

    {/* Paket: `services[]` je spisak onoga što je uključeno — sadržaj, ne
        cenovnik. Cena i trajanje stoje na korenu usluge, pa se ovde ništa ne
        bira; klijentkinja samo vidi šta paket obuhvata. */}
    {selectedService?.type === "group" &&
      selectedService.services &&
      selectedService.services.length > 0 && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-xs font-semibold text-gray-600 mb-2">
            Uključeno u paket
          </div>
          <ul className="space-y-1">
            {selectedService.services.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-gray-800"
              >
                <span
                  aria-hidden
                  className="mt-1.5 w-1.5 h-1.5 rounded-full bg-(--primary-color) flex-shrink-0"
                />
                <span>
                  {item.name}
                  {item.description && (
                    <span className="block text-xs text-gray-400">
                      {item.description}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

    {/* Extras */}
    {selectedService?.extras && selectedService.extras.length > 0 && (
      <div className="mt-3">
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Dodatne opcije
        </label>
        <div className="space-y-2">
          {selectedService.extras.map((extra, idx) => (
            <label
              key={idx}
              className="flex items-center justify-between px-3 py-2 rounded-xl border border-gray-200 cursor-pointer hover:border-(--primary-color)/20 bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedExtras.includes(extra.name)}
                  onChange={() =>
                    setSelectedExtras((prev) =>
                      prev.includes(extra.name)
                        ? prev.filter((n) => n !== extra.name)
                        : [...prev, extra.name],
                    )
                  }
                  className="rounded text-(--primary-color)"
                />
                <span className="text-sm text-gray-800">
                  {extra.name}
                </span>
              </div>
              <span className="text-xs font-semibold text-(--primary-color)">
                {extra.priceMode === "on_request"
                  ? PRICE_ON_REQUEST_LABEL
                  : extra.priceMode === "from"
                    ? formatServicePrice(extra.price || 0, extra.priceMode)
                    : `+${formatServicePrice(extra.price || 0, extra.priceMode)}`}
              </span>
            </label>
          ))}
        </div>
      </div>
    )}

    {/* Razložena procena. Kod usluga sa donjom granicom klijentkinja mora da
        vidi ŠTA se zna a šta ne — "od 3.000" bez razloga deluje proizvoljno. */}
    {selectedService && (
      <div className="mt-3 bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
        {priceLines.length > 1 && (
          <ul className="space-y-1 pb-2 mb-2 border-b border-gray-200">
            {priceLines.map((line, idx) => (
              <li
                key={idx}
                className="flex items-baseline justify-between gap-x-3 text-xs"
              >
                <span className="text-gray-600">
                  {line.kind === "extra" ? `+ ${line.label}` : line.label}
                </span>
                <span
                  className={
                    line.amount == null
                      ? "text-gray-400 italic"
                      : "text-gray-700 font-medium"
                  }
                >
                  {line.amount == null
                    ? PRICE_ON_REQUEST_LABEL
                    : formatServicePrice(line.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">
              {totalPriceLabel.startsWith("od ")
                ? "Trenutna procena"
                : "Ukupno"}
            </div>
            <div className="text-xs text-gray-400">{totalDuration} min</div>
          </div>
          <div className="text-xl font-bold text-(--primary-color) text-right">
            {totalPriceLabel || "—"}
          </div>
        </div>
      </div>
    )}
  </div>
    </>
  );
}
