"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { PlatformProfileForm } from "@/types/superadmin";

interface PlatformProfileResponse {
  profile: {
    displayName: string;
    contactPhone: string;
    marketingPhone?: string;
    logoUrl?: string;
    newsletterEmail?: string;
    contactEmail?: string;
  };
}

interface ApiErrorShape {
  response?: {
    data?: {
      error?: string;
    };
  };
}

const queryKey = ["superadmin-platform-profile"];

function toForm(data?: PlatformProfileResponse): PlatformProfileForm {
  const profile = data?.profile;
  return {
    name: profile?.displayName ?? "",
    phone: profile?.contactPhone ?? "",
    marketingPhone: profile?.marketingPhone ?? "",
    logoUrl: profile?.logoUrl ?? "",
    newsletterEmail: profile?.newsletterEmail ?? "",
    contactEmail: profile?.contactEmail ?? "",
  };
}

function getErrorMessage(error: unknown) {
  return (
    (error as ApiErrorShape)?.response?.data?.error ??
    "Greška pri čuvanju podataka."
  );
}

export function useSuperAdminPlatformProfile() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PlatformProfileForm>(toForm());
  const [formError, setFormError] = useState("");

  const profileQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get<PlatformProfileResponse>(
        "/superadmin/platform-profile",
      );
      return data;
    },
  });

  const saveProfile = useMutation({
    mutationFn: async (payload: PlatformProfileForm) => {
      const { data } = await api.patch("/superadmin/platform-profile", {
        displayName: payload.name,
        contactPhone: payload.phone,
        marketingPhone: payload.marketingPhone,
        logoUrl: payload.logoUrl,
        newsletterEmail: payload.newsletterEmail,
        contactEmail: payload.contactEmail,
      });
      return data as PlatformProfileResponse & { message?: string };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      toast.success(data.message ?? "Profil platforme je sačuvan.");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  useEffect(() => {
    async function syncProfileForm() {
      if (profileQuery.data) {
        setForm(toForm(profileQuery.data));
      }
    }
    syncProfileForm();
  }, [profileQuery.data]);

  async function submitProfile() {
    setFormError("");
    try {
      await saveProfile.mutateAsync(form);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  return {
    profileQuery,
    form,
    setForm,
    formError,
    submitProfile,
    saveProfile,
    getProfileErrorMessage: getErrorMessage,
  };
}
