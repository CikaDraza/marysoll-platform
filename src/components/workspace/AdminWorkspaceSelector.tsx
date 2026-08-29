"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import {
  BookOpenIcon,
  ScissorsIcon,
} from "@heroicons/react/24/outline";
import {
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
} from "@heroicons/react/20/solid";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import type { AdminWorkspace } from "@/lib/platform/workspace-capabilities";
import type { TenantCapabilitySnapshot } from "@/types/tenant-capabilities";
import { createAdminWorkspaceSelectorModel } from "./admin-workspace-selector-model";

interface AdminWorkspaceSelectorProps {
  activeWorkspace: AdminWorkspace;
  availableWorkspaces: readonly AdminWorkspace[];
  snapshotResolved: boolean;
  canActivateEducation: boolean;
  expanded: boolean;
  onWorkspaceSelected: () => void;
}

function WorkspaceIcon({ workspace }: { workspace: AdminWorkspace }) {
  const Icon = workspace === "education" ? BookOpenIcon : ScissorsIcon;
  return <Icon aria-hidden="true" className="size-5 shrink-0" />;
}

function errorMessage(error: unknown): string {
  const apiError = error as { response?: { data?: { error?: string } } };
  return (
    apiError.response?.data?.error ??
    "Edu Centar trenutno nije moguće aktivirati. Pokušajte ponovo."
  );
}

export default function AdminWorkspaceSelector({
  activeWorkspace,
  availableWorkspaces,
  snapshotResolved,
  canActivateEducation,
  expanded,
  onWorkspaceSelected,
}: AdminWorkspaceSelectorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activationOpen, setActivationOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const model = createAdminWorkspaceSelectorModel({
    activeWorkspace,
    availableWorkspaces,
    snapshotResolved,
    canActivateEducation,
  });

  if (model.options.length === 0) return null;

  const activateEducation = async () => {
    setIsActivating(true);
    setActivationError(null);

    try {
      const { data } = await api.post<{
        success: true;
        snapshot: TenantCapabilitySnapshot;
      }>("/tenant/education/activate");

      queryClient.setQueryData(["tenantCapabilities"], data.snapshot);
      await queryClient.invalidateQueries({
        queryKey: ["tenantCapabilities"],
        refetchType: "active",
      });

      const resolved =
        queryClient.getQueryData<TenantCapabilitySnapshot>([
          "tenantCapabilities",
        ]) ?? data.snapshot;
      const educationReady =
        resolved.verticals.includes("education") &&
        resolved.capabilities["education.catalog"].enabled;

      if (!educationReady) {
        setActivationError(
          "Aktivacija je sačuvana, ali Edu Centar još nije dostupan. Pokušajte ponovo.",
        );
        return;
      }

      setActivationOpen(false);
      onWorkspaceSelected();
      router.push("/education");
    } catch (error) {
      setActivationError(errorMessage(error));
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="mb-4 space-y-1">
      {expanded && (
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
          Radni prostor
        </p>
      )}

      <Menu as="div" className="relative">
        <MenuButton
          aria-label={`Radni prostor: ${model.buttonLabel}`}
          className={`flex w-full cursor-pointer items-center rounded-xl bg-violet-600 px-3 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${expanded ? "gap-3" : "justify-center"}`}
        >
          <WorkspaceIcon workspace={activeWorkspace} />
          {expanded && (
            <>
              <span className="flex-1 text-left">{model.buttonLabel}</span>
              <ChevronDownIcon aria-hidden="true" className="size-5 shrink-0" />
            </>
          )}
        </MenuButton>

        <MenuItems
          transition
          anchor="bottom start"
          className="z-[70] mt-2 w-[var(--button-width)] origin-top rounded-xl border border-gray-200 bg-white p-1.5 text-gray-700 shadow-lg ring-1 ring-black/5 transition duration-100 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:ring-white/10"
        >
          {model.options.map((option) => (
            <MenuItem key={option.workspace}>
              <button
                type="button"
                aria-current={option.active ? "page" : undefined}
                onClick={() => {
                  if (option.active) return;
                  onWorkspaceSelected();
                  router.push(option.path);
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition data-focus:bg-gray-100 data-focus:text-gray-900 dark:data-focus:bg-white/5 dark:data-focus:text-white"
              >
                <WorkspaceIcon workspace={option.workspace} />
                <span className="flex-1">{option.label}</span>
                {option.active && (
                  <CheckIcon
                    aria-label="Aktivni radni prostor"
                    className="size-5 text-violet-600 dark:text-violet-400"
                  />
                )}
              </button>
            </MenuItem>
          ))}

          {model.showEducationActivation && (
            <div className="mt-1 border-t border-gray-100 pt-1 dark:border-gray-700">
              <MenuItem>
                <button
                  type="button"
                  onClick={() => {
                    setActivationError(null);
                    setActivationOpen(true);
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-violet-700 transition data-focus:bg-violet-50 dark:text-violet-300 dark:data-focus:bg-violet-500/10"
                >
                  <PlusIcon aria-hidden="true" className="size-5" />
                  <span>Aktiviraj Edu Centar</span>
                </button>
              </MenuItem>
            </div>
          )}
        </MenuItems>
      </Menu>

      <Dialog
        open={activationOpen}
        onClose={() => {
          if (!isActivating) setActivationOpen(false);
        }}
        className="relative z-[100]"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-950/60 backdrop-blur-[1px] transition-opacity data-closed:opacity-0"
        />
        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6">
          <div className="flex min-h-full items-center justify-center">
            <DialogPanel
              transition
              className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-2xl transition duration-200 data-closed:scale-95 data-closed:opacity-0 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                <BookOpenIcon aria-hidden="true" className="size-6" />
              </div>
              <DialogTitle className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                Aktivirajte Edu Centar
              </DialogTitle>
              <div className="mt-2 space-y-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                <p>
                  Dodajte poseban radni prostor za kreiranje i upravljanje
                  edukativnim sadržajem.
                </p>
                <p>
                  Vaš Salon, postojeći sadržaj i podešavanja ostaju
                  nepromenjeni.
                </p>
              </div>

              {activationError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
                >
                  {activationError}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={isActivating}
                  onClick={() => setActivationOpen(false)}
                  className="cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Otkaži
                </button>
                <button
                  type="button"
                  disabled={isActivating}
                  onClick={activateEducation}
                  className="cursor-pointer rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {isActivating ? "Aktiviranje…" : "Aktiviraj Edu Centar"}
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
