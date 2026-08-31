import { IService } from "@/types";
import {
  minServicePrice as minPrice,
  isPriceFrom,
} from "@/helpers/servicePrice";
import { formatPriceToString, formatServicePrice } from "@/helpers/formatPrice";
import Image from "next/image";
import BlowDryingIcon from "@/components/assets/icons/services/BlowDryingIcon";
import EyebrowsIcon from "@/components/assets/icons/services/EyebrowsIcon";
import FigaroIcon from "@/components/assets/icons/services/FigaroIcon";
import FlowerIcon from "@/components/assets/icons/services/FlowerIcon";
import HairIcon from "@/components/assets/icons/services/Hair";
import HaircutIcon from "@/components/assets/icons/services/HaricutIcon";
import MakeupFaceIcon from "@/components/assets/icons/services/MakeupFaceIcon";
import MassageIcon from "@/components/assets/icons/services/MassageIcon";
import { ComponentType } from "react";
import { LymphDrainageIcon } from "@/components/assets/icons/services/LymphDrainageIcon";
import { ManualMassageIcon } from "@/components/assets/icons/services/ManualMassageIcon";
import { VacuumTreatmentIcon } from "@/components/assets/icons/services/VacuumTreatmentIcon";
import { ThermoBlanketIcon } from "@/components/assets/icons/services/ThermoBlanketIcon";
import { MaderoTherapyHandIcon } from "@/components/assets/icons/services/MaderoTherapyHandIcon";
import { MaderoTherapyRollerIcon } from "@/components/assets/icons/services/MaderoTherapyRollerIcon";
import { BodyShapeSlimIcon } from "@/components/assets/icons/services/BodyShapeSlimIcon";

const FALLBACK_SERVICES_IMAGE =
  "https://res.cloudinary.com/dufo1t5li/image/upload/v1771541591/salon/zycqbewvuphkygo2hr8w.jpg";

interface Props {
  services: IService[];
  headline?: string;
  subheadline?: string;
  tenantSlug?: string;
  imageUrl?: string;
  showIcons?: boolean;
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

export function Theme4ServicesSoft({
  services,
  headline,
  subheadline,
  imageUrl,
  showIcons,
}: Props) {
  const grouped = services.reduce<Record<string, IService[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <section id="services" className="bg-[#2b1e26] text-white py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12 items-start">
          <Image
            width={600}
            height={500}
            alt="Service image"
            src={imageUrl || FALLBACK_SERVICES_IMAGE}
            className="rounded-[40px] w-full h-auto object-cover"
          />

          <div className="lg:col-span-2">
            <p className="italic mb-2 text-xs text-[#E8D4AD]">{subheadline}</p>
            <h2 className="text-4xl mb-8">{headline}</h2>
            <div className="mt-12">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="mt-8">
                  <p className="text-xs uppercase tracking-widest text-[#E8D4AD] mb-3 border-b border-[#E8D4AD]/20 pb-2">
                    {category}
                  </p>

                  <ul className="space-y-4">
                    {items.map((s) => {
                      const mp = minPrice(s);
                      return (
                        <li key={s._id}>
                          <div className="flex justify-between items-center">
                            <span className="font-medium pr-4">{s.name}</span>
                            <hr className="flex-1 border-dashed border-[#E8D4AD]" />
                            {mp != null && (
                              <span className="text-[#E8D4AD] pl-4 text-sm">
                                {isPriceFrom(s) ? "od " : ""}
                                {formatPriceToString(mp)} RSD
                              </span>
                            )}
                          </div>

                          {/* Variants */}
                          {s.type === "variant" &&
                            (s.variants ?? []).length > 0 && (
                              <ul className="mt-1 space-y-0.5 pl-3 border-l border-[#E8D4AD]/20">
                                {s.variants!.map((v, i) => (
                                  <li
                                    key={i}
                                    className="flex justify-between text-xs text-[#E8D4AD]/70"
                                  >
                                    <span>{v.name}</span>
                                    <span>
                                      {formatServicePrice(v.price, v.priceMode)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}

                          {/* Group sub-services */}
                          {s.type === "group" &&
                            (s.services ?? []).length > 0 && (
                              <ul className="mt-1 space-y-0.5 pl-3 border-l border-[#E8D4AD]/20">
                                {s.services!.map((sv, i) => (
                                  <li
                                    key={i}
                                    className="flex justify-between text-xs text-[#E8D4AD]/70"
                                  >
                                    <span>{sv.name}</span>
                                    {sv.price != null && (
                                      <span>
                                        {formatServicePrice(
                                          sv.price,
                                          sv.priceMode,
                                        )}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}

                          {/* Extras */}
                          {(s.extras ?? []).length > 0 && (
                            <ul className="mt-1 space-y-0.5 pl-3 border-l border-[#E8D4AD]/10">
                              {s.extras!.map((e, i) => (
                                <li
                                  key={i}
                                  className="flex justify-between text-xs text-[#E8D4AD]/50"
                                >
                                  <span>+ {e.name}</span>
                                  <span>
                                    {formatServicePrice(
                                      e.price || 0,
                                      e.priceMode,
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          {services?.slice(0, 6).map((s, idx) => {
            const mp = minPrice(s);
            const priceMonthly = s.subscription.priceMonthly;
            const isOddCard = idx % 2 === 0;

            return (
              <div
                key={s._id}
                className={`p-6 transition flex flex-col ${isOddCard ? "bg-[#4C2D4A] text-white" : "bg-[#E8D4AD] hover:bg-[var(--secondary-color)]/40"}`}
              >
                <div className="flex justify-between w-full">
                  <p
                    className={`text-[10px] uppercase tracking-widest mb-1 ${isOddCard ? "text-white/60" : "text-[#2b1e26]/60"}`}
                  >
                    {s.category}
                  </p>
                  {showIcons && (
                    <CategoryIcon iconKey={s?.icon || ""} oddCard={isOddCard} />
                  )}
                </div>
                <h3
                  className={`text-xl pt-8 mb-1 font-medium tracking-widest mb-3 border-b pb-2 ${isOddCard ? "text-white border-white/20" : "text-[#2b1e26] border-[#2b1e26]/20"}`}
                >
                  {s.name}
                </h3>
                {s.description && (
                  <p
                    className={`text-xs py-4 ${isOddCard ? "text-white/70" : "text-[#2b1e26]/70"}`}
                  >
                    {s.description}
                  </p>
                )}
                <div className="mt-auto">
                  {mp != null && (
                    <p
                      className={`text-sm font-semibold ${isOddCard ? "text-white" : "text-[#2b1e26]"}`}
                    >
                      {isPriceFrom(s) ? "od " : ""}
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
    </section>
  );
}
