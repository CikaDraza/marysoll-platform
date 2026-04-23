import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { IService, IServiceInput } from "@/types";
import AdminServiceForm from "./AdminServiceForm";

export interface AdminServiceModalProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editing: IService | null;
  form: IServiceInput;
  setForm: React.Dispatch<React.SetStateAction<IServiceInput>>;
  save: () => Promise<void>;
}

export default function AdminServiceModal({
  isOpen,
  setIsOpen,
  editing,
  form,
  setForm,
  save,
}: AdminServiceModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      className="relative z-50"
    >
      <DialogBackdrop className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 flex items-center justify-center p-2">
        <DialogPanel className="max-w-xl w-full bg-white rounded-lg shadow-xl p-3 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {editing ? "Izmeni uslugu" : "Nova usluga"}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-600 hover:text-gray-900"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* ✨ Ovo umesto celog velikog form-a */}
          <AdminServiceForm
            editing={editing}
            form={form}
            setForm={setForm}
            save={save}
            onClose={() => setIsOpen(false)}
          />
        </DialogPanel>
      </div>
    </Dialog>
  );
}
