import HomepageAppointmentWidget from "./HomepageAppointmentWidget";
import * as HeroIcons from "@heroicons/react/24/outline";
import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ClockIcon,
  CursorArrowRaysIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/20/solid";
import { formatWorkingHoursForDisplay } from "@/helpers/parseWorkingHours";
import type { IService, SalonProfileData } from "@/types";

const DEFAULT_INSTRUCTIONS = [
  { name: "Izaberite uslugu i termin.", icon: CalendarDaysIcon },
  { name: "Zakazite termin u par klikova.", icon: CursorArrowRaysIcon },
  { name: "Dolazak u salon i kratka konsultacija.", icon: BuildingOffice2Icon },
  { name: "Profesionalna aplikacija tretmana.", icon: DevicePhoneMobileIcon },
  { name: "Dugotrajan rezultat i saveti za održavanje.", icon: ClockIcon },
];

interface Props {
  tenantSlug?: string;
  clientSlug?: string;
  salon: SalonProfileData;
  services: IService[];
  headline?: string;
  subheadline?: string;
  instructions?: { name: string; icon: string }[];
}

export function Theme1AppointmentSection({
  tenantSlug,
  clientSlug,
  salon,
  services,
  headline,
  subheadline,
  instructions,
}: Props) {
  // Resolve instructions — prefer CMS data, fall back to defaults
  const resolvedInstructions =
    instructions && instructions.length > 0
      ? instructions.map((instr) => {
          const IconComponent = HeroIcons[
            instr.icon as keyof typeof HeroIcons
          ] as React.ComponentType<React.SVGProps<SVGSVGElement>> | undefined;
          return { name: instr.name, Icon: IconComponent };
        })
      : DEFAULT_INSTRUCTIONS.map((d) => ({ name: d.name, Icon: d.icon }));

  const workingHours = formatWorkingHoursForDisplay(
    salon.workingHours as Record<string, unknown> | null,
  );

  return (
    <div className="overflow-hidden bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          <div className="lg:pt-4 lg:pr-8">
            <div className="lg:max-w-lg">
              <h2 className="mt-2 text-5xl font-semibold tracking-tight text-pretty text-black sm:text-6xl">
                {headline || "Zakazite svoj tretman odmah."}
              </h2>
              <p className="mt-6 text-lg/8 text-gray-700">
                {subheadline ||
                  "Pogledajte slobodne termine u kalendaru. Odaberite termin i uslugu koju želite."}
              </p>

              <dl className="mt-10 max-w-xl space-y-4 text-base/7 text-gray-600 lg:max-w-none">
                {resolvedInstructions.map((instruction, idx) => (
                  <div key={idx} className="relative pl-9">
                    <dt className="inline font-semibold text-gray-900">
                      {instruction.Icon && (
                        <instruction.Icon
                          aria-hidden="true"
                          className="absolute top-1 left-1 size-5 text-(--primary-color)"
                        />
                      )}
                      {instruction.name}
                    </dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div>
            {/* Working hours — always light, not affected by admin dark mode */}
            <div className="my-3 rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                Radno vreme
              </p>
              <ul className="space-y-1.5">
                {workingHours.map(({ day, hours: h, isOpen }) => (
                  <li key={day} className="flex items-center justify-between">
                    <span
                      className={`text-xs font-medium w-28 ${isOpen ? "text-zinc-600" : "text-gray-400"}`}
                    >
                      {day}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}
                    >
                      {h}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Appointment Calendar Widget */}
            <HomepageAppointmentWidget
              tenantSlug={tenantSlug}
              clientSlug={clientSlug}
              salon={salon}
              services={services}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
