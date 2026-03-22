import { useState } from "react";
import toast from "react-hot-toast";

export const useDeleteLanding = () => {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteLanding = async (campaignId: string) => {
    if (
      !confirm(
        "Da li ste sigurni da želite da obrišete ceo landing sadržaj? Ova akcija je nepovratna.",
      )
    ) {
      return false;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/newsletter/campaigns/${campaignId}/delete-landing`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) throw new Error("Greška pri brisanju");

      toast.success("Landing sadržaj je obrisan.");
      return true;
    } catch (err) {
      toast.error("Neuspešno brisanje.");
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteLanding, isDeleting };
};
