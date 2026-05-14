"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { AuthUserRow } from "@/types/superadmin";

interface ApiErrorShape {
  response?: {
    data?: {
      error?: string;
    };
  };
}

interface EditUserForm {
  name: string;
  email: string;
  phone: string;
  role: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return (error as ApiErrorShape)?.response?.data?.error ?? fallback;
}

export function useSuperAdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editUser, setEditUser] = useState<AuthUserRow | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({
    name: "",
    email: "",
    phone: "",
    role: "",
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const queryKey = useMemo(
    () => ["superadmin-auth-users", search, roleFilter],
    [search, roleFilter],
  );

  const usersQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("query", search.trim());
      if (roleFilter !== "all") qs.set("role", roleFilter);
      const { data } = await api.get<AuthUserRow[]>(
        `/superadmin/auth-users?${qs}`,
      );
      return data;
    },
  });

  const updateUser = useMutation({
    mutationFn: async () => {
      if (!editUser) return null;
      const { data } = await api.patch(
        `/superadmin/auth-users/${editUser._id}`,
        editForm,
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Korisnik sačuvan");
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ["superadmin-auth-users"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Greška pri čuvanju korisnika"));
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const user = (usersQuery.data ?? []).find((item) => item._id === id);
      const url = user?.isOrphan
        ? `/superadmin/auth-users/${id}?type=auth`
        : `/superadmin/auth-users/${id}`;
      const { data } = await api.delete(url);
      return data;
    },
    onSuccess: () => {
      toast.success("Korisnik obrisan");
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["superadmin-auth-users"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Greška pri brisanju korisnika"));
    },
  });

  function openEdit(user: AuthUserRow) {
    setEditUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      role: user.role,
    });
  }

  return {
    users: usersQuery.data ?? [],
    isLoading: usersQuery.isLoading,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    editUser,
    setEditUser,
    editForm,
    setEditForm,
    deleteId,
    setDeleteId,
    openEdit,
    updateUser: updateUser.mutateAsync,
    isUpdatingUser: updateUser.isPending,
    deleteUser: deleteUser.mutate,
  };
}
