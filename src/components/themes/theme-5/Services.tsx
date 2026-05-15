"use client";

import { useState } from "react";
import Image from "next/image";
import BlowDryingIcon from "@/components/assets/icons/services/BlowDryingIcon";
import EyebrowsIcon from "@/components/assets/icons/services/EyebrowsIcon";
import FigaroIcon from "@/components/assets/icons/services/FigaroIcon";
import FlowerIcon from "@/components/assets/icons/services/FlowerIcon";
import HairIcon from "@/components/assets/icons/services/Hair";
import HaircutIcon from "@/components/assets/icons/services/HaricutIcon";
import MakeupFaceIcon from "@/components/assets/icons/services/MakeupFaceIcon";
import MassageIcon from "@/components/assets/icons/services/MassageIcon";
import { IService } from "@/types";
import type { ComponentType } from "react";

interface DataProps {
  label: string;
  headline: string;
  subheadline: string;
  showIcons?: boolean;
}

const ACTIVE_BG = "#FFB633";

type ServiceIconProps = {
  bgColor?: string;
  width?: number;
  height?: number;
  hasCircle?: boolean;
};
type ServiceIconComp = ComponentType<ServiceIconProps>;

const SERVICE_ICONS: Record<string, ServiceIconComp> = {
  BlowDryingIcon,
  EyebrowsIcon,
  FigaroIcon,
  FlowerIcon,
  HairIcon,
  HaircutIcon,
  MakeupFaceIcon,
  MassageIcon,
};

const iconProps = (active: boolean): ServiceIconProps => ({
  width: 132,
  height: 132,
  hasCircle: false,
  bgColor: active ? "#ffffff" : "#9ca3af",
});

function CategoryIcon({
  iconKey,
  active,
}: {
  iconKey?: string;
  active: boolean;
}) {
  if (!iconKey || !SERVICE_ICONS[iconKey]) return null;
  const Comp = SERVICE_ICONS[iconKey];
  return <Comp {...iconProps(active)} />;
}

export function Theme5Services({
  data,
  services,
}: {
  data: DataProps;
  services: IService[];
}) {
  const showIcons = data.showIcons ?? true;

  const categories = Array.from(
    new Set(services.map((s) => s.category).filter(Boolean)),
  );
  const [activeCategory, setActiveCategory] = useState<string>(
    categories[0] ?? "",
  );
  const activeServices = services.filter((s) => s.category === activeCategory);
  const getCategoryIconKey = (cat: string): string | undefined =>
    services.find((s) => s.category === cat && s.icon)?.icon;

  return (
    <section id="services" className="py-16 bg-white text-center">
      <p className="text-sm tracking-widest text-gray-500 uppercase">
        {data?.label}
      </p>
      <h2 className="text-5xl text-gray-700 mt-2">{data?.headline}</h2>
      <p className="text-sm text-gray-500 mt-2">{data?.subheadline}</p>

      {/* Category tab strip */}
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
              {showIcons && (
                <CategoryIcon
                  iconKey={getCategoryIconKey(cat)}
                  active={active}
                />
              )}
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

      {/* Image + active category service list */}
      <div className="grid grid-cols-1 md:grid-cols-2 max-w-7xl min-h-[600px] mx-auto mt-12">
        <Image
          width={600}
          height={700}
          alt="girl on treatment"
          src="https://res.cloudinary.com/dufo1t5li/image/upload/v1776888255/makeup-services-img_mamndj.jpg"
          className="w-full object-contain h-full"
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
