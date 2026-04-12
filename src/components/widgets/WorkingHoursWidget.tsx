import { formatWorkingHoursForDisplay } from "@/helpers/parseWorkingHours";
import { SalonProfileData } from "@/types";

const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

export function WorkingHoursWidget({ profile }: { profile: SalonProfileData }) {
  const hours = formatWorkingHoursForDisplay(
    profile.workingHours as Record<string, unknown> | null,
  );

  return (
    <div className={card}>
      <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
        🕐 Radno vreme
      </h3>
      <ul className="space-y-1.5">
        {hours.map(({ day, hours: h, isOpen }) => (
          <li key={day} className="flex items-center justify-between">
            <span
              className={`text-xs font-medium w-28 ${isOpen ? "text-zinc-500" : "text-gray-400"}`}
            >
              {day}
            </span>
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
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
