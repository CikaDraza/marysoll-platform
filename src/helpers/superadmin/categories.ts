import type { CategoryForm, CategoryRow } from "@/types/superadmin";

export const emptyCategoryForm = (): CategoryForm => ({
  key: "",
  label: "",
  synonyms: "",
  subcategories: [{ key: "", label: "", synonyms: "" }],
  isActive: true,
  popularityScore: 0,
});

export function categoryRowToForm(category: CategoryRow): CategoryForm {
  return {
    key: category.key,
    label: category.label,
    synonyms: category.synonyms.join(", "),
    subcategories:
      category.subcategories.length > 0
        ? category.subcategories.map((sub) => ({
            key: sub.key,
            label: sub.label,
            synonyms: sub.synonyms.join(", "),
          }))
        : [{ key: "", label: "", synonyms: "" }],
    isActive: category.isActive,
    popularityScore: category.popularityScore,
  };
}

export function categoryFormToPayload(form: CategoryForm) {
  return {
    key: form.key.trim(),
    label: form.label.trim(),
    synonyms: form.synonyms
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    subcategories: form.subcategories
      .filter((sub) => sub.key.trim() && sub.label.trim())
      .map((sub) => ({
        key: sub.key.trim(),
        label: sub.label.trim(),
        synonyms: sub.synonyms
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      })),
    isActive: form.isActive,
    popularityScore: form.popularityScore,
  };
}
