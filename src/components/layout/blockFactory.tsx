// src/components/layout/blockFactory.tsx

import { BaseBlock } from "@/types/conversational/blocks";
import { AuthBlockView } from "../blocks-ai/AuthBlockView";
import PricingBlockView from "../blocks-ai/PricingBlockView";
import {
  AppointmentCalendarBlockType,
  AuthBlockType,
  CalendarBlockType,
  PricingBlockType,
} from "@/types/landing-block";
import AppointmentCalendarBlockView from "../blocks-ai/AppointmentCalendarBlockView";
import { CalendarBlockView } from "../blocks-ai/CalendarBlockView";

export function blockFactory(
  block: BaseBlock,
  onMessageAction?: (m: string) => void,
) {
  const safeOnAction =
    onMessageAction ||
    ((m: string) => console.warn("No action handler for:", m));

  switch (block.type) {
    case "AuthBlock":
      return (
        <AuthBlockView
          key={block.id}
          block={block as AuthBlockType}
          onActionComplete={safeOnAction}
        />
      );
    case "ServicePriceBlock":
      return (
        <PricingBlockView key={block.id} block={block as PricingBlockType} />
      );
    case "AppointmentCalendarBlock":
      return (
        <AppointmentCalendarBlockView
          key={block.id}
          block={block as AppointmentCalendarBlockType}
          onActionComplete={safeOnAction}
        />
      );
    case "CalendarBlock":
      return (
        <CalendarBlockView
          key={block.id}
          block={block as CalendarBlockType}
          onAction={safeOnAction}
        />
      );
    default:
      console.warn("Factory: Unknown block type", block.type);
      return null;
  }
}
