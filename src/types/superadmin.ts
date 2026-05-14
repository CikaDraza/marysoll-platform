import type { ComponentType } from "react";

export type SuperAdminTab =
  | "saloni"
  | "trial"
  | "planovi"
  | "statistika"
  | "korisnici"
  | "kategorije"
  | "podesavanja"
  | "chat"
  | "profil";

export interface SuperAdminTabConfig {
  id: SuperAdminTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export interface AuthUserRow {
  _id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isOnline: boolean;
  lastActive: string | null;
  isEmailVerified: boolean;
  createdAt: string | null;
  isOrphan?: boolean;
}

export interface SubcategoryForm {
  key: string;
  label: string;
  synonyms: string;
}

export interface CategoryForm {
  key: string;
  label: string;
  synonyms: string;
  subcategories: SubcategoryForm[];
  isActive: boolean;
  popularityScore: number;
}

export interface CategoryRow {
  _id: string;
  key: string;
  label: string;
  synonyms: string[];
  subcategories: { key: string; label: string; synonyms: string[] }[];
  isActive: boolean;
  popularityScore: number;
  createdAt: string;
}

export interface PlatformProfileForm {
  name: string;
  phone: string;
  marketingPhone: string;
  logoUrl: string;
  newsletterEmail: string;
  contactEmail: string;
}
