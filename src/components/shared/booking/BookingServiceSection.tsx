"use client";
/** BookingServiceSection — izbor usluge + varijante + dodaci + zbir cene/trajanja.
 *  Stanje čita iz BookingProvider konteksta — bez prop drilling-a. */
import { formatPriceToString, formatServicePrice } from "@/helpers/formatPrice";
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
    totalPrice,
    totalDuration,
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
            onChange={() => {
              setSelectedServiceId(s._id);
              setSelectedVariant("");
              setSelectedExtras([]);
            }}
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
                +{formatServicePrice(extra.price || 0, extra.priceMode)}
              </span>
            </label>
          ))}
        </div>
      </div>
    )}

    {/* Price summary */}
    {selectedService && (
      <div className="mt-3 flex items-center justify-between bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
        <div>
          <div className="text-xs text-gray-500">Ukupno</div>
          <div className="text-xs text-gray-400">
            {totalDuration} min
          </div>
        </div>
        <div className="text-xl font-bold text-(--primary-color)">
          {formatPriceToString(totalPrice)} RSD
        </div>
      </div>
    )}
  </div>
    </>
  );
}
