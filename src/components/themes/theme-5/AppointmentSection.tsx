import type { IService, SalonProfileData } from "@/types";
import HomepageAppointmentWidget from "../shared/HomepageAppointmentWidget";

interface Props {
  tenantSlug?: string;
  clientSlug?: string;
  salon: SalonProfileData;
  services: IService[];
}

export function Theme5AppointmentSection({
  tenantSlug,
  clientSlug,
  salon,
  services,
}: Props) {
  return (
    <section id="booking" className="py-20 bg-[#f0f0f0]">
      <div className="max-w-7xl mx-auto px-6 flex justify-center">
        <HomepageAppointmentWidget
          tenantSlug={tenantSlug}
          clientSlug={clientSlug}
          salon={salon}
          services={services}
        />
      </div>
    </section>
  );
}
