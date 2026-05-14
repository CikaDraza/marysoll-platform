"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

interface ChangeSuperAdminPasswordInput {
  currentPassword: string;
  newPassword: string;
}

interface ApiErrorShape {
  response?: {
    data?: {
      error?: string;
    };
  };
}

function getErrorMessage(error: unknown) {
  return (
    (error as ApiErrorShape)?.response?.data?.error ??
    "Greška pri promeni lozinke."
  );
}

export function useSuperAdminPassword() {
  const changePassword = useMutation({
    mutationFn: async (payload: ChangeSuperAdminPasswordInput) => {
      const { data } = await api.post("/superadmin/change-password", payload);
      return data as { success: boolean; message?: string };
    },
    onSuccess: (data) => {
      toast.success(data.message ?? "Lozinka uspešno promenjena.");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  return {
    changePassword,
    getChangePasswordErrorMessage: getErrorMessage,
  };
}
