import Image from "next/image";
import type { ClientOverview } from "@/types/client-overview";
import { ClientOverviewSection } from "./ClientOverviewSection";
import { formatClientMoney } from "./formatters";

type AppointmentItem = ClientOverview["appointments"]["items"][number];

function AppointmentRequest({ request }: { request: AppointmentItem["request"] }) {
  if (!request) return null;
  return <>{request.note && <p className="mt-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-950">Zahtev: {request.note}</p>}{request.referenceUrl && <a className="text-violet-600 hover:underline" href={request.referenceUrl} target="_blank" rel="noreferrer">Referenca klijenta</a>}<div className="mt-2 flex flex-wrap gap-2">{request.attachments.map((attachment) => <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer"><Image src={attachment.url} alt="Prilog uz zahtev" width={64} height={64} className="h-16 w-16 rounded-lg object-cover" /></a>)}</div></>;
}

function AppointmentCard({ appointment }: { appointment: AppointmentItem }) {
  const value = appointment.status === "completed" ? appointment.realizedValue : appointment.potentialValue;
  return <article className="rounded-xl border border-gray-100 p-4 text-sm dark:border-gray-800"><div className="flex flex-wrap justify-between gap-2"><strong>{appointment.serviceName}</strong><span>{appointment.date} · {appointment.time} · {appointment.status}</span></div><p className="mt-1 text-gray-500">{formatClientMoney(value)}</p><AppointmentRequest request={appointment.request} /></article>;
}

function AppointmentPagination({ pagination, onPageChange }: { pagination: ClientOverview["appointments"]["pagination"]; onPageChange: (page: number) => void }) {
  if (pagination.totalPages <= 1) return null;
  return <div className="flex items-center justify-between pt-2 text-sm"><button disabled={!pagination.hasPrevPage} onClick={() => onPageChange(pagination.page - 1)} className="font-bold text-violet-600 disabled:opacity-30">← Prethodna</button><span>{pagination.page} / {pagination.totalPages}</span><button disabled={!pagination.hasNextPage} onClick={() => onPageChange(pagination.page + 1)} className="font-bold text-violet-600 disabled:opacity-30">Sledeća →</button></div>;
}

function AppointmentList({ appointments, onPageChange }: { appointments: ClientOverview["appointments"]; onPageChange: (page: number) => void }) {
  if (!appointments.items.length) return <p className="text-sm text-gray-500">Nema termina.</p>;
  return <div className="space-y-3">{appointments.items.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} />)}<AppointmentPagination pagination={appointments.pagination} onPageChange={onPageChange} /></div>;
}

export function ClientAppointmentsSection({ appointments, onPageChange }: { appointments: ClientOverview["appointments"]; onPageChange: (page: number) => void }) {
  return <ClientOverviewSection title={`Termini (${appointments.pagination.totalCount})`} open><AppointmentList appointments={appointments} onPageChange={onPageChange} /></ClientOverviewSection>;
}
