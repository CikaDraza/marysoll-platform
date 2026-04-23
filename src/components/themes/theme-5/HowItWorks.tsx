import { IService } from "@/types";

interface Props {
  data: {
    services: IService[];
    headline?: string;
    subheadline?: string;
    steps?: { title: string; description: string; icon: string }[];
  };
}

export function Theme5HowItWorks({ data }: Props) {
  return (
    <section className="py-16 bg-[#f0f0f0] text-center">
      <h3 className="text-xl mb-10">{data?.headline}</h3>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {data?.steps?.map((s, i) => (
          <div key={i} className="flex items-center gap-6 px-6 py-3">
            <div className="text-3xl mb-3">
              <div>{s.icon}</div>
            </div>
            <div>
              <h4 className="font-medium">{s.title}</h4>
              <p className="text-sm opacity-70">{s.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
