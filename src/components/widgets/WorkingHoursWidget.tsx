import { formatWorkingHoursForDisplay } from "@/helpers/parseWorkingHours";
import { shouldShowWorkingHours } from "@/helpers/workingHoursDisplay";
import {
  WorkingHoursNote,
  AppointmentRulesLink,
} from "@/components/shared/WorkingHoursNote";
import {
  getActiveOrUpcomingVacation,
  formatVacationRange,
} from "@/helpers/vacations";
import { SalonProfileData } from "@/types";

const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

/** Istaknuti red "Odmor 25.07 - 03.08" u istom formatu kao redovi radnog vremena. */
function VacationRow({ range }: { range: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-xs font-medium w-28 text-amber-600 dark:text-amber-500">
        Odmor
      </span>
      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
        {range}
      </span>
    </li>
  );
}

export function WorkingHoursWidget({
  profile,
  rulesHref,
  className = "",
}: {
  profile: SalonProfileData;
  rulesHref?: string;
  className?: string;
}) {
  const hours = formatWorkingHoursForDisplay(
    profile.workingHours as Record<string, unknown> | null,
  );
  const vacation = getActiveOrUpcomingVacation(profile.vacations);

  if (!shouldShowWorkingHours(profile)) {
    return (
      <div className={`${card} ${className}`}>
        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
          🕐 Zakazivanje
        </h3>
        {vacation && (
          <ul className="mb-3">
            <VacationRow range={formatVacationRange(vacation)} />
          </ul>
        )}
        <WorkingHoursNote rulesHref={rulesHref} />
      </div>
    );
  }

  return (
    <div className={`${card} ${className}`}>
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
        {vacation && <VacationRow range={formatVacationRange(vacation)} />}
      </ul>
      {rulesHref && (
        <p className="mt-3 text-xs">
          <AppointmentRulesLink rulesHref={rulesHref} />
        </p>
      )}
    </div>
  );
}
