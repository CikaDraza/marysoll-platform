import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import axios from "axios";

function handleError(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    toast.error(err.response?.data?.message || fallback);
  } else {
    toast.error(fallback);
  }
}

export function useCreateSalonProfile(token?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: FormData) => {
      const res = await api.post("/salon-profile/create", data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Salon uspešno kreiran!");
      qc.invalidateQueries({ queryKey: ["salonProfile"] });
    },
    onError: (err) => handleError(err, "Greška pri kreiranju salona."),
  });
}

export function useUpdateSalonProfile(token?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: FormData) => {
      const res = await api.put("/salon-profile/update", data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Salon uspešno ažuriran!");
      qc.invalidateQueries({ queryKey: ["salonProfile"] });
    },
    onError: (err) => handleError(err, "Greška pri ažuriranju salona."),
  });
}

export function useDeleteSalonFields(token?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (fields: string[]) => {
      const res = await api.patch(
        "/salon-profile/delete",
        { fields },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
    onSuccess: () => {
      toast.success("Polje uspešno obrisano!");
      qc.invalidateQueries({ queryKey: ["salonProfile"] });
    },
    onError: (err) => handleError(err, "Greška pri brisanju polja."),
  });
}
