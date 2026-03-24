import { formatWorkingHoursForDisplay } from "@/helpers/parseWorkingHours";
import { SalonProfileData } from "@/types";

export function WorkingHoursWidget({ profile }: { profile: SalonProfileData }) {
  const hours = formatWorkingHoursForDisplay(
    profile.workingHours as Record<string, unknown> | null,
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-bold text-gray-800 mb-4 text-sm">🕐 Radno vreme</h3>
      <ul className="space-y-2">
        {hours.map(({ day, hours: h, isOpen }) => (
          <li key={day} className="flex flex-col flex-wrap text-sm">
            <span
              className={`font-medium min-w-36 max-w-full ${isOpen ? "text-gray-700" : "text-gray-400"}`}
            >
              {day}
            </span>
            <span
              className={`text-xs mx-auto my-1 px-2 py-0.5 rounded-full ${
                isOpen
                  ? "bg-green-100 text-green-700 font-medium"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {h}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
