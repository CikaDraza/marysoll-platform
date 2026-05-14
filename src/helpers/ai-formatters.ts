// src/helpers/ai-formatters.ts

import { IService } from "@/types";
import { formatServicePrice } from "@/helpers/formatPrice";

export function formatServicesForAI(services: IService[]) {
  return services
    .map((s) => {
      const variants = s.variants
        ?.map((v) => `${v.name} (${formatServicePrice(v.price, v.priceMode)})`)
        .join(", ");
      return `- ${s.category} > ${s.name}${s.subcategory ? ` (${s.subcategory})` : ""}: ${formatServicePrice(s.basePrice, s.priceMode)}. Varijante: [${variants}]`;
    })
    .join("\n");
}
