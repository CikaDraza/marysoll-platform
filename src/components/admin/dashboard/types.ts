/**
 * DashboardTabProps — sav state/handleri AdminDashboard-a koje tabovi koriste.
 * Tabovi destrukturiraju svoj podskup; izvor istine ostaje u page.tsx.
 */
import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import type { useAuth } from "@/hooks/useAuth";
import type { useTenantAdmin } from "@/hooks/useTenantAdmin";
import type { useSalonProfileAdmin } from "@/hooks/useSalonProfileAdmin";
import type { useAdminServices } from "@/hooks/useAdminServices";
import type { SeoAnalysisResult } from "./shared";

export type SalonProfileAdmin = ReturnType<typeof useSalonProfileAdmin>;
export type AdminServices = ReturnType<typeof useAdminServices>;

export interface PwForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface DashboardTabProps {
  sp: SalonProfileAdmin;
  svc: AdminServices;
  hasProfile: boolean;
  user: ReturnType<typeof useAuth>["user"];
  token: ReturnType<typeof useAuth>["token"];
  tenant: ReturnType<typeof useTenantAdmin>["tenant"];
  updateIdentity: ReturnType<typeof useTenantAdmin>["updateIdentity"];
  isUpdatingIdentity: boolean;
  isOwner: boolean;
  identityOpen: boolean;
  setIdentityOpen: Dispatch<SetStateAction<boolean>>;
  identityForm: { slug: string; cloudinaryFolder: string };
  setIdentityForm: Dispatch<SetStateAction<{ slug: string; cloudinaryFolder: string }>>;
  deleteSalonInput: string;
  setDeleteSalonInput: Dispatch<SetStateAction<string>>;
  showDeleteSalon: boolean;
  setShowDeleteSalon: Dispatch<SetStateAction<boolean>>;
  isDeletingSalon: boolean;
  fileRef: RefObject<HTMLInputElement | null>;
  notifLogoRef: RefObject<HTMLInputElement | null>;
  pwForm: PwForm;
  setPwForm: Dispatch<SetStateAction<PwForm>>;
  pwLoading: boolean;
  pwError: string;
  handlePasswordChange: (e: FormEvent) => Promise<void>;
  handleDeleteSalon: () => Promise<void>;
  handleSaveWithAccount: () => void;
  metadataSeoResult: SeoAnalysisResult | null;
  setMetadataSeoResult: Dispatch<SetStateAction<SeoAnalysisResult | null>>;
  showMetadataSeoPanel: boolean;
  setShowMetadataSeoPanel: Dispatch<SetStateAction<boolean>>;
  isAnalyzingMetadataSeo: boolean;
  isAutoFixingMetadataSeo: boolean;
  runMetadataSeoAnalysis: () => Promise<void>;
  handleMetadataSeoAutoFix: () => Promise<void>;
  handleSaveMetadataSeo: () => void;
  manualDaysCount: number;
  setManualDaysCount: Dispatch<SetStateAction<number>>;
  manualDateKeys: string[];
}
