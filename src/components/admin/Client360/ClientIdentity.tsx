import type { ClientOverview } from "@/types/client-overview";

export function ClientIdentity({ client }: { client: ClientOverview["client"] }) {
  return (
    <header className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-2xl font-black text-gray-900 dark:text-white">{client.name}</h2>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
        <span>{client.email}</span>
        {client.phone && <span>{client.phone}</span>}
        {client.instagram && <span>@{client.instagram}</span>}
        {client.tiktok && <span>TikTok: @{client.tiktok}</span>}
      </div>
      <p className="mt-2 text-xs text-gray-400">Klijent od {new Date(client.createdAt).toLocaleDateString("sr-RS")}</p>
    </header>
  );
}
