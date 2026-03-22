"use client";

import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserMutations } from "@/hooks/useUserMutations";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import Loader from "../elements/Loader";

export default function ClientProfile() {
  const { data: user, isLoading } = useCurrentUser();
  const { updateUser, deleteUser } = useUserMutations();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    birthday: "",
    password: "",
    confirmPassword: "",
  });
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  if (isLoading) return <Loader />;
  if (!user) return <p>Korisnik nije pronađen</p>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = () => {
    setFormData({
      name: user.name || "",
      phone: user.phone || "",
      birthday: user.birthday
        ? new Date(user.birthday).toISOString().split("T")[0]
        : "",
      password: "",
      confirmPassword: "",
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowPasswordFields(false);
  };

  const handleUpdate = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (showPasswordFields && formData.password !== formData.confirmPassword) {
      toast.error("Lozinke se ne poklapaju");
      return;
    }

    if (formData.password && formData.password.length < 6) {
      toast.error("Lozinka mora imati najmanje 6 karaktera");
      return;
    }

    try {
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        birthday: formData.birthday ? new Date(formData.birthday) : null,
        ...(showPasswordFields &&
          formData.password && { password: formData.password }),
      };

      await updateUser.mutateAsync({
        id: user._id,
        updatedData: updateData,
      });
      setIsEditing(false);
      setShowPasswordFields(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (deleteEmail !== user.email) {
      toast.error("Email se ne poklapa");
      return;
    }

    try {
      await deleteUser.mutateAsync(user._id);
      setShowDeleteConfirmation(false);
      // Ovde možda želite da preusmerite korisnika na logout ili homepage
    } catch (err) {
      console.error(err);
    }
  };

  const canDelete = deleteEmail === user.email;

  return (
    <div className="rounded-lg shadow p-3 lg:p-6">
      <Toaster position="top-right" />
      <div className="flex flex-col lg:flex-row justify-between items-center mb-6">
        <h2 className="text-xl! lg:text-2xl! mb-6 lg:mb-0 font-bold text-gray-900">
          Moje Lične informacije
        </h2>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="cursor-pointer px-6 py-3 w-full lg:w-auto bg-(--secondary-color) text-white rounded-lg hover:bg-(--secondary-color)/90"
          >
            Izmeni podatke
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ime i prezime
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-md border-gray-200 p-3 bg-gray-50 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full rounded-md border-gray-200 p-3 bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Telefon
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-md border-gray-200 p-3 bg-gray-50 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Datum rođenja
              </label>
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
                className="w-full rounded-md border-gray-200 p-3 bg-gray-50 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Reset Lozinke
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordFields(!showPasswordFields)}
                className="cursor-pointer text-(--secondary-color) hover:text-(--secondary-color)/80 underline"
              >
                {showPasswordFields ? "Sakrij" : "Promeni lozinku"}
              </button>
            </div>

            {showPasswordFields ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nova lozinka
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full rounded-md border-gray-200 p-3 bg-gray-50 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Najmanje 6 karaktera
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Potvrdi lozinku
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full rounded-md border-gray-200 p-3 bg-gray-50 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    lozinka
                  </label>
                  <p className="p-3 bg-gray-100 text-gray-600 rounded-lg">
                    ••••••••
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Najmanje 6 karaktera
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col lg:flex-row items-start gap-2 mt-6">
              <span className="text-sm text-gray-600">
                Želite da promenite lozinku?
              </span>
              <Link
                href="/forgot-password"
                className="text-(--secondary-color) hover:text-(--secondary-color)/80 underline text-sm"
              >
                Resetujte lozinku
              </Link>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="cursor-pointer px-6 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={updateUser.isPending}
              className="cursor-pointer px-6 py-3 bg-(--secondary-color) text-white rounded-lg hover:bg-(--secondary-color)/90 disabled:opacity-50"
            >
              {updateUser.isPending ? "Čuvanje..." : "Sačuvaj promene"}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ime i prezime
              </label>
              <p className="p-3 bg-gray-50 rounded-md">
                {user.name || "Nije postavljeno"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <p className="p-3 bg-gray-50 rounded-md">{user.email}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Telefon
              </label>
              <p className="p-3 bg-gray-50 rounded-md">
                {user.phone || "Nije postavljeno"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Datum rođenja
              </label>
              <p className="p-3 bg-gray-50 rounded-md">
                {user.birthday
                  ? new Date(user.birthday).toLocaleDateString("sr-RS")
                  : "Nije postavljeno"}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-2xl! font-semibold text-gray-900 mb-4">
              Reset Lozinke
            </h2>
            <div className="flex flex-col items-start gap-6">
              <div className="w-full lg:w-1/2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Lozinka
                </label>
                <p className="p-3 bg-gray-100 text-gray-600 rounded-lg">
                  ••••••••
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="px-6 py-3 text-white rounded-lg bg-(--secondary-color) hover:bg-(--secondary-color)/90"
              >
                Resetuj lozinku
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Sekcija za brisanje naloga */}
      <div className="mt-12 pt-8 border-t border-gray-200 bg-gray-900 rounded-xl p-3">
        <h2 className="text-2xl! font-semibold text-white mb-4">
          Brisanje naloga
        </h2>
        <p className="text-gray-300 mb-6">
          Brisanjem naloga trajno brišete sve vaše podatke. Ova akcija se ne
          može opozvati.
        </p>

        {!showDeleteConfirmation ? (
          <button
            onClick={() => setShowDeleteConfirmation(true)}
            className="cursor-pointer w-full py-3 bg-(--red-color) text-white rounded-lg hover:bg-red-700"
          >
            Obriši nalog
          </button>
        ) : (
          <div className="space-y-4 animate-fadeIn">
            <p className="text-gray-300">
              Za potvrdu brisanja, unesite vaš email:{" "}
              <strong className="text-white">{user.email}</strong>
            </p>
            <input
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              placeholder="Unesite vaš email"
              className="w-full rounded-lg bg-gray-100 p-3 focus:outline-2 focus:-outline-offset-2 focus:outline-red-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setDeleteEmail("");
                }}
                className="cursor-pointer flex-1 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
              >
                Otkaži
              </button>
              <button
                onClick={handleDelete}
                disabled={!canDelete || deleteUser.isPending}
                className="cursor-pointer flex-2 lg:flex-1 py-3 bg-(--red-color) text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleteUser.isPending ? "Brisanje..." : "Potvrdi brisanje"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
