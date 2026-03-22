// /src/hooks/useServiceMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { IService, IServiceInput } from "@/types";
import { toast } from "react-hot-toast";

export function useServiceMutations() {
  const qc = useQueryClient();

  // CREATE
  const createService = useMutation<IService, Error, IServiceInput>({
    mutationFn: async (payload) => {
      const { data } = await api.post("/services/create", payload);
      return data as IService;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Usluga uspešno kreirana.");
    },
    onError: () => {
      toast.error("Greška pri kreiranju usluge.");
    },
  });

  // UPDATE
  const updateService = useMutation<
    IService,
    Error,
    { id: string; payload: IServiceInput }
  >({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put(`/services/${id}/update/`, payload);
      return data as IService;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Usluga je ažurirana.");
    },
    onError: () => {
      toast.error("Greška pri ažuriranju usluge.");
    },
  });

  // DELETE
  const deleteService = useMutation<IService, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/services/${id}/delete/`);
      return data as IService;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Usluga obrisana.");
    },
    onError: () => {
      toast.error("Greška pri brisanju usluge.");
    },
  });

  return {
    createService,
    updateService,
    deleteService,
  };
}
