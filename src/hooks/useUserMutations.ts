import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { IUser } from "@/types";
import toast from "react-hot-toast";

export function useUserMutations() {
  const queryClient = useQueryClient();

  const updateUser = useMutation({
    mutationFn: async ({
      id,
      updatedData,
    }: {
      id: string;
      updatedData: Partial<IUser>;
    }) => {
      const { data } = await api.put(`/users/${id}/update`, updatedData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Korisnik uspešno ažuriran");
    },
    onError: (error: unknown) => {
      const errorMessage =
        (error instanceof Error && error.message) ||
        "Greška pri ažuriranju korisnika";
      toast.error(errorMessage);
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/users/${id}/delete`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Korisnik uspešno obrisan");
    },
    onError: (error: unknown) => {
      const errorMessage =
        (error instanceof Error && error.message) ||
        "Greška pri brisanju korisnika";
      toast.error(errorMessage);
    },
  });

  return { updateUser, deleteUser };
}
