"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useClients } from "@/hooks/useClients";
import { useDebounce } from "@/hooks/useDebounce";
import type { EducationAccessMode } from "@/types/education-content";

const COPY: Record<
  Exclude<EducationAccessMode, "public">,
  { title: string; help: string }
> = {
  private: {
    title: "Pristup klijentima",
    help: "Ovaj sadržaj nije javno vidljiv. Izaberite kome se prikazuje u njenom prostoru.",
  },
  gated: {
    title: "Pristup sadržaju",
    help: "Sadržaj je javno vidljiv kao pregled. Odobrite ceo tekst određenim klijentkinjama.",
  },
};

/**
 * Dodela sadržaja klijentkinjama.
 *
 * Spisak se šalje deklarativno — ono što je štiklirano ima pristup, ostalima se
 * povlači. Sam pristup se NIKADA ne proverava ovde: server pri svakom čitanju
 * traži tenant, klijenta, dodelu i njen status.
 */
export default function EducationClientAccess({
  contentId,
  accessMode,
}: {
  contentId: string;
  accessMode: Exclude<EducationAccessMode, "public">;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const query = useDebounce(search, 300);
  const { data: clients } = useClients({ limit: 20, query });

  const assignmentsKey = ["education", "assignments", contentId];
  const { data: assigned } = useQuery({
    queryKey: assignmentsKey,
    queryFn: async () => {
      const { data } = await api.get<{ clientProfileIds: string[] }>(
        `/education/content/${contentId}/assignments`,
      );
      return data.clientProfileIds;
    },
  });

  const save = useMutation({
    mutationFn: async (clientProfileIds: string[]) => {
      await api.put(`/education/content/${contentId}/assignments`, {
        clientProfileIds,
      });
      return clientProfileIds;
    },
    onSuccess: (clientProfileIds) => {
      queryClient.setQueryData(assignmentsKey, clientProfileIds);
      void queryClient.invalidateQueries({ queryKey: assignmentsKey });
    },
    onError: () => toast.error("Pristup nije sačuvan. Pokušajte ponovo."),
  });

  const current = assigned ?? [];
  const copy = COPY[accessMode];

  const toggle = (clientProfileId: string) =>
    save.mutate(
      current.includes(clientProfileId)
        ? current.filter((id) => id !== clientProfileId)
        : [...current, clientProfileId],
    );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="font-semibold text-gray-900 dark:text-white">
        {copy.title}
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {copy.help}
      </p>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Pretraži klijente…"
        className="mt-4 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />

      <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
        {(clients?.users ?? []).map((client) => {
          const id = String(client._id);
          const checked = current.includes(id);

          return (
            <li key={id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-800">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={save.isPending}
                  onChange={() => toggle(id)}
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900 dark:text-white">
                    {client.name || client.email}
                  </span>
                  {client.name && (
                    <span className="block truncate text-xs text-gray-500">
                      {client.email}
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
        {current.length === 0
          ? "Niko još nema pristup."
          : `${current.length} sa pristupom`}
      </p>
    </section>
  );
}
