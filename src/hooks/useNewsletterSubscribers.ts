// hooks/useNewsletterSubscribers.ts
import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface Subscriber {
  _id: string;
  email: string;
  name: string;
  source: "guest" | "registered";
}

interface UseNewsletterSubscribersReturn {
  subscribers: Subscriber[];
  selected: string[]; // emailovi
  isLoadingUser: boolean;
  error: unknown;
  search: string;
  setSearch: (term: string) => void;
  toggleSubscriber: (email: string) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  hasSelection: boolean;
  total: number;
  page: number;
  setPage: (page: number) => void;
  pages: number;
}

export function useNewsletterSubscribers(): UseNewsletterSubscribersReturn {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["newsletter-subscribers", { search, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", page.toString());
      params.set("limit", "50");

      const res = await api.get(`/newsletter/subscribers?${params}`);
      return res.data;
    },
    enabled: Boolean(search || page), // ❗ ne traži ako su oba prazna
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  const subscribers = useMemo(
    () => data?.subscribers || [],
    [data?.subscribers]
  );
  const total = data?.pagination?.total || 0;
  const pages = data?.pagination?.pages || 1;

  const toggleSubscriber = useCallback((email: string) => {
    setSelected((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.length === subscribers.length) {
      setSelected([]);
    } else {
      setSelected(subscribers.map((s: Subscriber) => s.email));
    }
  }, [subscribers, selected.length]);

  const clearSelection = useCallback(() => {
    setSelected([]);
    toast.success("Svi korisnici su obrisani iz kampanje");
  }, []);

  const hasSelection = selected.length > 0;

  return {
    subscribers,
    selected,
    isLoadingUser: isLoading,
    error,
    search,
    setSearch,
    toggleSubscriber,
    toggleAll,
    clearSelection,
    hasSelection,
    total,
    page,
    setPage,
    pages,
  };
}
