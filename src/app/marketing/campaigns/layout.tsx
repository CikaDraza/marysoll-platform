"use client";

import { FeatureGate } from "@/components/shared/FeatureGate";

export default function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeatureGate feature="emailCampaignAi">{children}</FeatureGate>
  );
}
