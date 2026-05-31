import { formatWorkingHoursForDisplay } from "@/helpers/parseWorkingHours";
import { SalonProfile } from "@/types";

interface Props {
  workingHours: SalonProfile["workingHours"];
  tenantSlug?: string;
}

export function Theme5WorkingHours({ workingHours, tenantSlug: _tenantSlug }: Props) {
  const formattedHours = formatWorkingHoursForDisplay(
    workingHours as Record<string, unknown> | null,
  );

  return (
    <section className="bg-[#FFB633] text-white py-20">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 px-6">
        <div className="col-span-2">
          <p className="italic">otvoreni smo za vas</p>
          <h2 className="text-3xl mb-6">RADNO VREME</h2>

          <ul className="space-y-2">
            {formattedHours.map(({ day, hours: h, isOpen }) => (
              <li
                key={day}
                className="flex justify-between border-b border-gray-200 pb-2"
              >
                <span>{day}</span>
                <span
                  className={`${
                    isOpen ? "text-white font-medium" : "text-gray-500"
                  }`}
                >
                  {h}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
