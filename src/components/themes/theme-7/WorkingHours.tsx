import { formatWorkingHoursForDisplay } from "@/helpers/parseWorkingHours";
import type { SalonProfileData } from "@/types";

interface Props {
  workingHours?: SalonProfileData["workingHours"] | null;
}

/**
 * Theme7WorkingHours — Lash-Room restyle of the shared WorkingHoursWidget.
 * Same functionality (parses workingHours via formatWorkingHoursForDisplay),
 * rendered for the dark footer "Visit" column. Falls back to a generic line
 * when no hours are configured.
 */
export function Theme7WorkingHours({ workingHours }: Props) {
  const hours = formatWorkingHoursForDisplay(
    (workingHours as Record<string, unknown>) ?? null,
  );

  if (!hours || hours.length === 0) {
    return (
      <ul className="space-y-2.5 text-[15px] text-cream/75">
        <li>By appointment only</li>
        <li>DM to confirm address</li>
      </ul>
    );
  }

  return (
    <ul className="space-y-2 text-[14px] text-cream/75">
      {hours.map(({ day, hours: h, isOpen }) => (
        <li key={day} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isOpen ? "bg-neon" : "bg-cream/20"
              }`}
            />
            {day}
          </span>
          <span className={isOpen ? "text-cream/90" : "text-cream/40"}>{h}</span>
        </li>
      ))}
    </ul>
  );
}
