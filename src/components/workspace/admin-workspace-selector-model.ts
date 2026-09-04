import type { AdminWorkspace } from "@/lib/platform/workspace-capabilities";

const WORKSPACE_DEFINITIONS = {
  salon: { label: "Salon", path: "/dashboard" },
  education: { label: "Edu Centar", path: "/education" },
} as const satisfies Record<
  AdminWorkspace,
  { label: string; path: "/dashboard" | "/education" }
>;

export interface AdminWorkspaceSelectorOption {
  workspace: AdminWorkspace;
  label: string;
  path: "/dashboard" | "/education";
  active: boolean;
}

export function createAdminWorkspaceSelectorModel(params: {
  activeWorkspace: AdminWorkspace;
  availableWorkspaces: readonly AdminWorkspace[];
  snapshotResolved: boolean;
  canActivateEducation: boolean;
}) {
  const available = [...new Set(params.availableWorkspaces)];
  const active = WORKSPACE_DEFINITIONS[params.activeWorkspace];

  return {
    buttonLabel: active.label,
    options: available.map((workspace): AdminWorkspaceSelectorOption => ({
      workspace,
      ...WORKSPACE_DEFINITIONS[workspace],
      active: workspace === params.activeWorkspace,
    })),
    showEducationActivation:
      params.snapshotResolved &&
      params.canActivateEducation &&
      available.includes("salon") &&
      !available.includes("education"),
  };
}
