"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import toast from "react-hot-toast";
import { getUserFromToken } from "@/lib/auth/auth-utils";
import { LoggedInUser, LoginResponse, RegisterPayload } from "@/types/auth/types";

export function useAuthActions() {
  const queryClient = useQueryClient();

  // 1. Fetch trenutnog korisnika iz localStorage
  const { data: user, isLoading } = useQuery<LoggedInUser | null>({
    queryKey: ["authUser"],
    queryFn: (): LoggedInUser | null => {
      if (typeof window === "undefined") return null;
      const token = localStorage.getItem("assistant_token");
      if (!token) return null;
      const decoded = getUserFromToken(token);
      if (!decoded) return null;
      // Map DecodedUser → LoggedInUser (add token field)
      return {
        id:      decoded.id,
        email:   decoded.email,
        name:    decoded.name,
        isAdmin: decoded.isAdmin,
        token,
        isOnline: decoded.isOnline,
      };
    },
    staleTime: Infinity,
  });

  // 2. Login Mutacija
  const loginMutation = useMutation({
    mutationFn: async (
      credentials: Pick<LoggedInUser, "email"> & { password: string },
    ) => {
      const { data } = await axios.post<LoginResponse>(
        "/api/external/auth/login",
        credentials,
      );
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem("assistant_token", data.token);
      queryClient.setQueryData(["authUser"], getUserFromToken(data.token));
      toast.success(`Dobrodošli nazad, ${data.user.name}`);
    },
    onError: (error: AxiosError<{ error: string }>) => {
      toast.error(error.response?.data?.error || "Prijava nije uspela");
    },
  });

  // 3. Register Mutacija
  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { data } = await axios.post<LoginResponse>(
        "/api/external/auth/register",
        payload,
      );
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem("assistant_token", data.token);
      queryClient.setQueryData(["authUser"], getUserFromToken(data.token));
      toast.success("Uspešno ste se registrovali!");
    },
    onError: (error: AxiosError<{ error: string }>) => {
      toast.error(error.response?.data?.error || "Greška pri registraciji");
    },
  });

  // 5. Forgot Password Mutacija
  const forgotPasswordMutation = useMutation({
    mutationFn: async ({
      email,
      assistantSlug,
      isAssistant,
    }: {
      email: string;
      assistantSlug: string;
      isAssistant: boolean;
    }) => {
      // Ovde gađaš proxy ili direktno rutu na glavnom sajtu
      const { data } = await axios.post("/api/external/auth/forgot-password", {
        email,
        assistantSlug,
        isAssistant,
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Link za resetovanje je poslat na vaš email.");
    },
    onError: (error: AxiosError<{ error: string }>) => {
      toast.error(error.response?.data?.error || "Greška pri slanju zahteva");
    },
  });

  // 6. Reset Password Mutacija
  const resetPasswordMutation = useMutation({
    mutationFn: async ({
      token,
      newPassword,
    }: {
      token: string;
      newPassword: string;
    }) => {
      const { data } = await axios.post("/api/external/auth/reset-password", {
        token,
        newPassword,
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Šifra je uspešno promenjena!");
    },
    onError: (error: AxiosError<{ error: string }>) => {
      toast.error(
        error.response?.data?.error || "Greška pri resetovanju šifre",
      );
    },
  });

  // 7. Logout
  const logout = () => {
    localStorage.removeItem("assistant_token");
    queryClient.setQueryData(["authUser"], null);
    toast.success("Odjavljeni ste.");
  };

  // Explicit cast ensures components can access LoggedInUser properties without TS inference issues
  const typedUser = user as LoggedInUser | null;

  return {
    user: typedUser,
    token: typedUser?.token,
    isLoggedIn: !!typedUser,
    isAdmin: !!typedUser?.isAdmin,
    isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    forgotPassword: ({
      email,
      assistantSlug,
      isAssistant,
    }: {
      email: string;
      assistantSlug: string;
      isAssistant: boolean;
    }) =>
      forgotPasswordMutation.mutateAsync({ email, assistantSlug, isAssistant }),
    isSendingForgot: forgotPasswordMutation.isPending,
    resetPassword: resetPasswordMutation.mutateAsync,
    isResetting: resetPasswordMutation.isPending,
    logout,
  };
}
