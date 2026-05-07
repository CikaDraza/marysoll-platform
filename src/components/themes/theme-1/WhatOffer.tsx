import BlowDryingIcon from "@/components/assets/icons/services/BlowDryingIcon";
import { BodyShapeSlimIcon } from "@/components/assets/icons/services/BodyShapeSlimIcon";
import EyebrowsIcon from "@/components/assets/icons/services/EyebrowsIcon";
import FigaroIcon from "@/components/assets/icons/services/FigaroIcon";
import FlowerIcon from "@/components/assets/icons/services/FlowerIcon";
import HairIcon from "@/components/assets/icons/services/Hair";
import HaircutIcon from "@/components/assets/icons/services/HaricutIcon";
import { LymphDrainageIcon } from "@/components/assets/icons/services/LymphDrainageIcon";
import { MaderoTherapyHandIcon } from "@/components/assets/icons/services/MaderoTherapyHandIcon";
import { MaderoTherapyRollerIcon } from "@/components/assets/icons/services/MaderoTherapyRollerIcon";
import MakeupFaceIcon from "@/components/assets/icons/services/MakeupFaceIcon";
import { ManualMassageIcon } from "@/components/assets/icons/services/ManualMassageIcon";
import MassageIcon from "@/components/assets/icons/services/MassageIcon";
import { ThermoBlanketIcon } from "@/components/assets/icons/services/ThermoBlanketIcon";
import { VacuumTreatmentIcon } from "@/components/assets/icons/services/VacuumTreatmentIcon";
import { formatPriceToString } from "@/helpers/formatPrice";
import type { IService } from "@/types";
import { ComponentType } from "react";

interface Props {
  services: IService[];
  headline?: string;
  subheadline?: string;
  tenantSlug?: string;
  showIcons?: boolean;
}

function minPrice(s: IService): number | null {
  if (s.type === "single") return s.basePrice ?? null;
  if (s.type === "variant") {
    const p = (s.variants ?? []).map((v) => v.price);
    return p.length ? Math.min(...p) : null;
  }
  if (s.type === "group") {
    const p = (s.services ?? [])
      .map((sv) => sv.price)
      .filter((x): x is number => x != null);
    return p.length ? Math.min(...p) : null;
  }
  return null;
}

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
  LymphDrainageIcon,
  ManualMassageIcon,
  VacuumTreatmentIcon,
  ThermoBlanketIcon,
  MaderoTherapyHandIcon,
  MaderoTherapyRollerIcon,
  BodyShapeSlimIcon,
};

function CategoryIcon({
  iconKey,
  oddCard,
}: {
  iconKey?: string;
  oddCard: boolean;
}) {
  if (!iconKey || !SERVICE_ICONS[iconKey]) return null;
  const Comp = SERVICE_ICONS[iconKey];
  return <Comp {...iconProps(oddCard)} />;
}

const iconProps = (oddCard: boolean): ServiceIconProps => ({
  width: 96,
  height: 96,
  hasCircle: false,
  bgColor: oddCard ? "#ffffff" : "#2b1e26",
});

export function Theme1WhatOffer({
  services,
  headline,
  subheadline,
  tenantSlug,
  showIcons,
}: Props) {
  const servicesHref = tenantSlug ? `/${tenantSlug}/usluge` : "/usluge";

  return (
    <section className="py-40 lg:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <p className="text-sm pb-2 font-semibold text-(--primary-color) tracking-widest text-center mb-2">
          {subheadline || "šta nudimo"}
        </p>
        <h2 className="text-5xl lg:text-6xl font-bold text-black text-center mb-16">
          {headline || "Usluge za vašu lepotu"}
        </h2>
        <div className="space-y-12">
          {/* GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            {services?.slice(0, 6).map((s, idx) => {
              const mp = minPrice(s);
              const priceMonthly = s.subscription.priceMonthly;
              const isOddCard = idx % 2 === 0;

              return (
                <div
                  key={s._id}
                  className={`p-6 transition flex flex-col ${isOddCard ? "bg-black text-white hover:bg-(--primary-color)" : "bg-gray-100 hover:bg-(--primary-color) text-black hover:text-white"} rounded-lg`}
                >
                  <div className="flex justify-between w-full">
                    <p className={`text-[10px] uppercase tracking-widest mb-1`}>
                      {s.category}
                    </p>
                    {showIcons && (
                      <CategoryIcon
                        iconKey={s?.icon || ""}
                        oddCard={isOddCard}
                      />
                    )}
                  </div>
                  <h3
                    className={`text-xl pt-8 mb-1 font-medium tracking-widest mb-3 border-b pb-2`}
                  >
                    {s.name}
                  </h3>
                  {s.description && (
                    <p className={`text-xs py-4`}>{s.description}</p>
                  )}
                  <div className="mt-auto">
                    {mp != null && (
                      <p className={`text-sm font-semibold`}>
                        {s.type !== "single" ? "od " : ""}
                        {formatPriceToString(mp)} RSD
                      </p>
                    )}
                    {s.subscription?.enabled && (
                      <p
                        className={`text-xs mt-1 ${isOddCard ? "text-white/80" : "text-[#2b1e26]/80"}`}
                      >
                        {s.subscription.subscriptionType === "monthly"
                          ? `${formatPriceToString(mp)} RSD / mesečno`
                          : `${formatPriceToString(priceMonthly)} RSD - Paket ${s.subscription?.treatmentCount} tretmana`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
