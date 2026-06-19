import { formatWorkingHoursForDisplay } from "@/helpers/parseWorkingHours";
import type { SalonProfileData } from "@/types";

interface Props {
  workingHours?: SalonProfileData["workingHours"] | null;
}

/**
 * Theme8WorkingHours — Y2K restyle of the shared working-hours widget for the
 * dark footer "Visit" column. Same parsing (formatWorkingHoursForDisplay), falls
 * back to a generic line when no hours are configured.
 */
export function Theme8WorkingHours({ workingHours }: Props) {
  const hours = formatWorkingHoursForDisplay(
    (workingHours as Record<string, unknown>) ?? null,
  );

  if (!hours || hours.length === 0) {
    return (
      <ul className="space-y-1.5 text-[15px] font-semibold text-white/85">
        <li>By appointment only</li>
        <li>Tue – Sat · 9–18h</li>
        <li>DM to confirm address</li>
      </ul>
    );
  }

  return (
    <ul className="space-y-1.5 text-[14px] font-semibold text-white/85">
      {hours.map(({ day, hours: h, isOpen }) => (
        <li key={day} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isOpen ? "bg-y2k-hot" : "bg-white/25"
              }`}
            />
            {day}
          </span>
          <span className={isOpen ? "text-white" : "text-white/40"}>{h}</span>
        </li>
      ))}
    </ul>
  );
}
