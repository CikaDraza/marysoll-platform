"use client";

import { JSX, useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { IUser } from "@/types";
import { useUserMutations } from "@/hooks/useUserMutations";
import AlertModal from "../modals/AlertModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: IUser | null;
  updateUser: ReturnType<typeof useUserMutations>["updateUser"];
}

export function ClientUpdateModal({
  isOpen,
  onClose,
  user,
  updateUser,
}: Props) {
  // Deriviramo početne vrednosti direktno iz user objekta - ovo će se pozvati pri svakom renderu
  const initialFormData = {
    name: user?.name || "",
    phone: user?.phone || "",
    birthday: user?.birthday
      ? new Date(user.birthday).toISOString().split("T")[0]
      : "",
    password: "",
    confirmPassword: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleShowPassword = () => {
    setShowPasswordFields(!showPasswordFields);
    if (showPasswordFields) {
      setMessage("");
    }
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setMessage("");
    if (showPasswordFields) {
      // Ako je jedno polje popunjeno, moraju biti oba
      const hasPassword = formData.password.trim().length > 0;
      const hasConfirmPassword = formData.confirmPassword.trim().length > 0;

      if (hasPassword || hasConfirmPassword) {
        // Ako je popunjeno jedno polje, mora biti popunjeno i drugo
        if (!hasPassword || !hasConfirmPassword) {
          toast.error("Oba polja za lozinku moraju biti popunjena");
          setMessage(
            "Ako ne želite da menjate lozinku, sakrij te polja na dugme iznad",
          );
          return;
        }

        // Provera da li se lozinke poklapaju
        if (formData.password !== formData.confirmPassword) {
          toast.error("Lozinke se ne poklapaju");
          return;
        }

        // Provera minimalne dužine lozinke
        if (formData.password.length < 6) {
          toast.error("Lozinka mora imati najmanje 6 karaktera");
          return;
        }
      }
    }

    try {
      const updateData: Partial<IUser> = {
        name: formData.name,
        phone: formData.phone,
        birthday: formData.birthday ? new Date(formData.birthday) : null,
      };

      if (showPasswordFields && formData.password) {
        updateData.password = formData.password;
      }

      if (!user?._id) return;

      await updateUser.mutateAsync({
        id: user._id,
        updatedData: updateData,
      });
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      key={user._id} // Ovo je ključ! Forcira re-mount kada se promeni user
      className="relative my-20 z-50"
    >
      <DialogBackdrop className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-lg w-full bg-white rounded-lg shadow-xl p-6 overflow-scroll max-h-[90vh]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Ažuriranje korisnika: {user.name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Ime i prezime
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-200 p-2 bg-gray-100 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="mt-1 block w-full rounded-md border-gray-200 p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Telefon
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-200 p-2 bg-gray-100 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Datum rođenja
              </label>
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-200 p-2 bg-gray-100 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)"
              />
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => handleShowPassword()}
                className={`${
                  message && "animate-pulse"
                } w-full cursor-pointer text-sm text-white bg-(--primary-color) px-6 py-3 rounded-lg hover:bg-(--primary-color)/80 mb-3`}
              >
                {showPasswordFields
                  ? "Sakrij polja za lozinku"
                  : "Promeni lozinku"}
              </button>

              {showPasswordFields && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Nova lozinka
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="mt-1 block w-full rounded-md border-gray-200 p-2 bg-gray-100 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Najmanje 6 karaktera
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Potvrdi lozinku
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="mt-1 block w-full rounded-md border-gray-200 p-2 bg-gray-100 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)"
                    />
                  </div>
                  {message && (
                    <span className="text-(--red-color) text-xs">
                      {message}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Otkaži
              </button>
              <button
                type="submit"
                disabled={updateUser.isPending}
                className="cursor-pointer px-4 py-2 bg-(--secondary-color) text-white rounded-md hover:bg-(--secondary-color)/90 disabled:opacity-50"
              >
                {updateUser.isPending ? "Ažuriranje..." : "Ažuriraj"}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default function ClientModalActionButtons({
  userIsSet,
}: {
  userIsSet: IUser;
}): JSX.Element {
  const { updateUser, deleteUser } = useUserMutations();
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleUpdateClick = () => {
    setIsUpdateModalOpen(true);
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteUser.mutateAsync(userIsSet._id);
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className="flex gap-x-4">
        <button
          onClick={handleUpdateClick}
          className="cursor-pointer text-blue-600 hover:text-blue-800 text-xs disabled:opacity-50 underline"
        >
          Ažuriraj
        </button>
        <button
          onClick={handleDeleteClick}
          className="cursor-pointer text-red-600 hover:text-red-800 text-xs disabled:opacity-50 underline"
        >
          Obriši klijenata
        </button>
      </div>

      {/* Modali - svaki modal se mountuje sa svojim user-om */}
      <ClientUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        user={userIsSet}
        updateUser={updateUser}
      />

      <AlertModal
        open={isDeleteModalOpen}
        setOpen={setIsDeleteModalOpen}
        onConfirm={confirmDelete}
        title={`Izbriši ${userIsSet.name} nalog`}
        message="Da li ste sigurni da želite da obrišete ovaj nalog? Ova akcija se ne može opozvati."
      />
    </>
  );
}
