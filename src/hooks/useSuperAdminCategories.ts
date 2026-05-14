"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import {
  categoryFormToPayload,
  categoryRowToForm,
  emptyCategoryForm,
} from "@/helpers/superadmin/categories";
import type { CategoryForm, CategoryRow } from "@/types/superadmin";

interface ApiErrorShape {
  response?: {
    data?: {
      error?: string;
    };
  };
}

const queryKey = ["superadmin-categories"];

function getErrorMessage(error: unknown, fallback: string) {
  return (error as ApiErrorShape)?.response?.data?.error ?? fallback;
}

export function useSuperAdminCategories() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyCategoryForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get<CategoryRow[]>("/superadmin/categories");
      return data;
    },
  });

  const categories = categoriesQuery.data ?? [];

  const saveCategory = useMutation({
    mutationFn: async () => {
      const payload = categoryFormToPayload(form);
      if (editCategory) {
        const { data } = await api.put(
          `/superadmin/categories/${editCategory._id}`,
          payload,
        );
        return data;
      }

      const { data } = await api.post("/superadmin/categories", payload);
      return data;
    },
    onSuccess: () => {
      toast.success(editCategory ? "Kategorija ažurirana" : "Kategorija kreirana");
      queryClient.invalidateQueries({ queryKey });
      closeForm();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Greška pri čuvanju kategorije"));
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/superadmin/categories/${id}`);
      return data;
    },
    onSuccess: () => {
      toast.success("Kategorija obrisana");
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Greška pri brisanju kategorije"));
    },
  });

  const toggleCategoryActive = useMutation({
    mutationFn: async (category: CategoryRow) => {
      const { data } = await api.put(`/superadmin/categories/${category._id}`, {
        ...category,
        isActive: !category.isActive,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Greška pri promeni statusa"));
    },
  });

  function openCreate() {
    setEditCategory(null);
    setForm(emptyCategoryForm());
    setShowForm(true);
  }

  function openEdit(category: CategoryRow) {
    setEditCategory(category);
    setForm(categoryRowToForm(category));
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditCategory(null);
    setForm(emptyCategoryForm());
  }

  const state = useMemo(
    () => ({
      categories,
      isLoading: categoriesQuery.isLoading,
      showForm,
      editCategory,
      form,
      deleteId,
      expandedId,
      isSaving: saveCategory.isPending,
    }),
    [
      categories,
      categoriesQuery.isLoading,
      showForm,
      editCategory,
      form,
      deleteId,
      expandedId,
      saveCategory.isPending,
    ],
  );

  return {
    ...state,
    setForm,
    setDeleteId,
    setExpandedId,
    openCreate,
    openEdit,
    closeForm,
    saveCategory: saveCategory.mutateAsync,
    deleteCategory: deleteCategory.mutate,
    toggleCategoryActive: toggleCategoryActive.mutate,
  };
}
