import { useMemo } from "react";
import { useClients } from "@/hooks/useClients";
import { useDebounce } from "@/hooks/useDebounce";
import { useDuplicateGroups } from "@/hooks/loyalty/useLoyaltyAdminMerge";

export interface ClientDuplicateInfo {
  isKeeper: boolean;
  targetId: string;
  targetName: string;
}

interface UseClientDirectoryOptions {
  page: number;
  query: string;
  date: string;
}

type DuplicateGroups = NonNullable<ReturnType<typeof useDuplicateGroups>["data"]>["groups"];

function keeperFor(group: DuplicateGroups[number]) {
  return group.accounts.find((account) => account.isRegistered) ?? group.accounts[0];
}

function duplicateName(account: DuplicateGroups[number]["accounts"][number]) {
  return account.name || account.email || "keeper";
}

function buildDuplicateMap(groups: DuplicateGroups) {
  const entries = groups.flatMap((group) => {
    const keeper = keeperFor(group);
    if (!keeper) return [];
    return group.accounts.map((account) => [account._id, {
      isKeeper: account._id === keeper._id,
      targetId: keeper._id,
      targetName: duplicateName(keeper),
    }] as const);
  });
  return new Map<string, ClientDuplicateInfo>(entries);
}

export function useClientDirectory({ page, query, date }: UseClientDirectoryOptions) {
  const debouncedText = useDebounce(query, 300);
  const debouncedDate = useDebounce(date, 200);
  const clientsQuery = useClients({ page, limit: 10, query: debouncedText, date: debouncedDate });
  const duplicateGroupsQuery = useDuplicateGroups();

  const duplicateMap = useMemo(
    () => buildDuplicateMap(duplicateGroupsQuery.data?.groups ?? []),
    [duplicateGroupsQuery.data?.groups],
  );

  const users = useMemo(() => clientsQuery.data?.users ?? [], [clientsQuery.data?.users]);

  return {
    ...clientsQuery,
    users,
    pagination: clientsQuery.data?.pagination,
    duplicateMap,
    debouncedText,
    debouncedDate,
  };
}
