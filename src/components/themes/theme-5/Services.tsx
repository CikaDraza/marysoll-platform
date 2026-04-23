"use client";

import { useState } from "react";
import BlowDryingIcon from "@/components/assets/icons/BlowDryingIcon";
import EyebrowsIcon from "@/components/assets/icons/EyebrowsIcon";
import FigaroIcon from "@/components/assets/icons/FigaroIcon";
import FlowerIcon from "@/components/assets/icons/FlowerIcon";
import MakeupFaceIcon from "@/components/assets/icons/MakeupFaceIcon";
import MassageIcon from "@/components/assets/icons/MassageIcon";
import { IService } from "@/types";
import Image from "next/image";

interface Props {
  label: string;
  headline: string;
  subheadline: string;
}

const ACTIVE_BG = "#FFB633";

const iconProps = (active: boolean) => ({
  width: 132,
  height: 132,
  hasCircle: false,
  bgColor: active ? "#ffffff" : "#9ca3af",
});

function CategoryIcon({
  category,
  active,
}: {
  category: string;
  active: boolean;
}) {
  const lower = category.toLowerCase();
  const p = iconProps(active);

  if (/kos|friz|hair|blow/.test(lower)) return <BlowDryingIcon {...p} />;
  if (/obr|trepav|eye|brow/.test(lower)) return <EyebrowsIcon {...p} />;
  if (/šmink|makeup|make|lice|nega|facial/.test(lower))
    return <MakeupFaceIcon {...p} />;
  if (/masaž|massage|relax/.test(lower)) return <MassageIcon {...p} />;
  return <FigaroIcon {...p} />;
}

export function Theme5Services({
  data,
  services,
}: {
  data: Props;
  services: IService[];
}) {
  const categories = Array.from(
    new Set(services.map((s) => s.category).filter(Boolean)),
  );

  const [activeCategory, setActiveCategory] = useState<string>(
    categories[0] ?? "",
  );

  const activeServices = services.filter((s) => s.category === activeCategory);

  return (
    <section className="py-16 bg-white text-center">
      <h2 className="text-sm tracking-widest text-gray-500 uppercase">
        {data?.label}
      </h2>
      <h3 className="text-2xl text-gray-700 mt-2">{data?.headline}</h3>
      <p className="text-sm text-gray-500 mt-2">{data?.subheadline}</p>

      {/* Category cards */}
      <div
        className="mt-10 max-w-7xl mx-auto px-4 grid"
        style={{
          gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))`,
        }}
      >
        {categories.map((cat) => {
          const active = cat === activeCategory;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex flex-col items-center justify-center gap-2 px-4 py-5 border cursor-pointer transition-all duration-200 h-full"
              style={{
                backgroundColor: active ? ACTIVE_BG : "#ffffff",
                borderColor: active ? ACTIVE_BG : "#e5e7eb",
              }}
            >
              <CategoryIcon category={cat} active={active} />
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: active ? "#ffffff" : "#6b7280" }}
              >
                {cat}
              </span>
            </button>
          );
        })}
      </div>

      {/* Static image + active category services */}
      <div className="grid grid-cols-1 md:grid-cols-2 max-w-7xl mx-auto mt-12">
        <Image
          width={600}
          height={700}
          alt="girl on treatment"
          src="https://res.cloudinary.com/dufo1t5li/image/upload/v1776888255/makeup-services-img_mamndj.jpg"
          className="w-full object-cover h-full"
        />

        <div className="text-left p-8 space-y-6 overflow-y-auto max-h-[560px]">
          {activeServices.map((s) => (
            <div
              key={s._id}
              className="pb-5 border-b border-gray-100 last:border-0 last:pb-0"
            >
              <h4 className="font-semibold text-gray-800">{s.name}</h4>
              {s.description && (
                <p className="text-sm text-gray-500 mt-1.5">{s.description}</p>
              )}
              {s.items && s.items.filter(Boolean).length > 0 && (
                <ul
                  role="list"
                  className="mt-3 space-y-1.5 text-sm text-gray-600"
                >
                  {s.items.filter(Boolean).map((item) => (
                    <li key={item} className="flex gap-x-3 items-center">
                      <FlowerIcon bgColor={ACTIVE_BG} />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
