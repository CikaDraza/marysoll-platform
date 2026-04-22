import { formatWorkingHoursForDisplay } from "@/helpers/parseWorkingHours";
import { SalonProfile } from "@/types";
import Image from "next/image";

interface Props {
  workingHours: SalonProfile["workingHours"];
}

export function Theme4WorkingHours({ workingHours }: Props) {
  const formattedHours = formatWorkingHoursForDisplay(
    workingHours as Record<string, unknown> | null,
  );

  return (
    <section className="bg-[#2b1e26] text-white py-20">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 px-6">
        <div>
          <p className="italic">otvoreni smo za vas</p>
          <h2 className="text-3xl mb-6">RADNO VREME</h2>

          <ul className="space-y-2">
            {formattedHours.map(({ day, hours: h, isOpen }) => (
              <li
                key={day}
                className="flex justify-between border-b border-[#E8D4AD] pb-2"
              >
                <span>{day}</span>
                <span
                  className={`${
                    isOpen ? "text-[#E8D4AD] font-medium" : "text-gray-400"
                  }`}
                >
                  {h}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Image
          width={400}
          height={350}
          alt=""
          src="https://res.cloudinary.com/dufo1t5li/image/upload/v1770903577/salon/zysz4hhfrghqftptog50.jpg"
          className="rounded-[40px] object-cover ml-auto"
        />
      </div>
    </section>
  );
}
