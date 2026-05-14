"use client";

import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { SuperAdminChatWorkspace } from "@/components/admin/chat/SuperAdminChatWorkspace";
import { superAdminCardClass as card } from "@/components/superadmin/shared";
import type { TenantRow } from "@/hooks/useSuperAdminTenants";

interface ChatTabProps {
  tenants: TenantRow[];
  selected: TenantRow | null;
  onSelect: (tenant: TenantRow) => void;
}

export function ChatTab({ tenants, selected, onSelect }: ChatTabProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Chat sa vlasnicima salona</h2>
      <p className="text-slate-400 text-sm">
        Izaberite salon iz liste da otvorite razgovor sa vlasnikom.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-14rem)]">
        <div className={card + " overflow-y-auto"}>
          <h3 className="font-semibold text-sm mb-3 sticky top-0 bg-slate-800 pb-2">
            Saloni
          </h3>
          <div className="space-y-1">
            {tenants.map((tenant) => (
              <button
                key={tenant._id}
                onClick={() => onSelect(tenant)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  selected?._id === tenant._id
                    ? "bg-violet-700 text-white"
                    : "text-slate-300 hover:bg-slate-700"
                }`}
              >
                <p className="font-medium">{tenant.name}</p>
                <p className="text-xs opacity-70">
                  {tenant.owner?.email ?? "—"}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div
          className={card + " lg:col-span-2 flex flex-col overflow-hidden p-4"}
        >
          {selected ? (
            <SuperAdminChatWorkspace
              tenantId={selected._id}
              tenantName={selected.name}
              ownerEmail={selected.owner?.email}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              <div className="text-center">
                <ChatBubbleLeftRightIcon className="size-12 mx-auto mb-3 opacity-30" />
                <p>Izaberite salon iz liste</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
