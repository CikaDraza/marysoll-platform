"use client";

import { useState } from "react";
import { useClientOverview } from "@/hooks/useClientOverview";
import { ClientIdentity } from "./ClientIdentity";
import { ClientInsightsSection } from "./ClientInsightsSection";
import { ClientAppointmentsSection } from "./ClientAppointmentsSection";
import { ClientLoyaltySection } from "./ClientLoyaltySection";
import { ClientTestimonialsTable } from "./ClientTestimonialsTable";
import { isClientInsightsVisible } from "./presentation";

export default function Client360({
  clientId,
  onBack,
}: {
  clientId: string;
  onBack: () => void;
}) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [appointmentPage, setAppointmentPage] = useState(1);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const { data, isLoading, isError, isFetching } = useClientOverview(
    clientId,
    month,
    year,
    appointmentPage,
  );

  if (isLoading) return <p className="py-10 text-center text-sm text-gray-500">Učitavanje Client 360 dosijea…</p>;
  if (isError || !data) return <p className="py-10 text-center text-sm text-red-600">Client 360 nije moguće učitati.</p>;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm font-bold text-violet-600 hover:underline">← Svi klijenti</button>
      <ClientIdentity client={data.client} />
      {isClientInsightsVisible(data.insights.available) && (
        <ClientInsightsSection
          insights={data.insights}
          month={month}
          year={year}
          isFetching={isFetching}
          onMonthChange={setMonth}
          onYearChange={setYear}
        />
      )}
      <ClientAppointmentsSection appointments={data.appointments} onPageChange={setAppointmentPage} />
      <ClientLoyaltySection
        loyalty={data.loyalty}
        client={data.client}
        adjustOpen={adjustOpen}
        onAdjustOpen={() => setAdjustOpen(true)}
        onAdjustClose={() => setAdjustOpen(false)}
      />
      <ClientTestimonialsTable testimonials={data.testimonials} />
    </div>
  );
}
