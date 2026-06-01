import { IService } from "@/types";
import * as Icons from "@heroicons/react/24/outline";

interface Props {
  data: {
    services: IService[];
    headline?: string;
    subheadline?: string;
    steps?: { title: string; description: string; icon: keyof typeof Icons }[];
  };
  tenantSlug?: string;
}

export function Theme5HowItWorks({ data }: Props) {
  return (
    <section className="py-16 bg-[#f0f0f0] text-center">
      <span className="text-xs text-gray-500">Uživajte u našim ulugama</span>
      <h2 className="text-2xl font-light text-gray-800 mb-10">
        {data?.headline}
      </h2>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {data?.steps?.map((s, i) => {
          const Icon = Icons[s.icon];
          return (
            <div key={i} className="flex flex-col items-center gap-6 px-6 py-3">
              <div className="text-3xl border border-[#FFB633] rounded-full size-24 lg:size-33 flex items-center justify-center">
                {Icon && (
                  <Icon className="size-12 lg:size-16 fill-1 text-[#FFB633]" />
                )}
              </div>
              <div>
                <h4 className="font-medium text-gray-500">{s.title}</h4>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
