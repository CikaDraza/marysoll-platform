import { IAppointment } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

export function useAppointmentMutations(token?: string) {
  const queryClient = useQueryClient();

  const createAppointment = useMutation({
    mutationFn: async (payload: IAppointment) => {
      if (!token) {
        throw new Error("Morate biti prijavljeni da biste zakazali termin.");
      }
      const res = await fetch("/api/appointments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      // Ako server vrati HTML umesto JSON-a, baci jasniju grešku
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "Server je vratio neispravan odgovor (HTML). Proverite login status.",
        );
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Greška pri kreiranju termina");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Termin uspešno zakazan.");
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async ({
      id,
      updatedData,
    }: {
      id: string;
      updatedData: Partial<IAppointment>;
    }) => {
      const res = await fetch(`/api/appointments/update/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });

      if (!res.ok) throw new Error("Greška pri ažuriranju termina");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Termin je pomeren.");
    },
  });

  const updateClientAppointment = useMutation({
    mutationFn: async ({
      id,
      updatedData,
    }: {
      id: string;
      updatedData: Partial<IAppointment>;
    }) => {
      const res = await fetch(`/api/appointments/client/${id}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Greška pri ažuriranju termina");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Termin je ažuriran.");
    },
  });

  const cancelClientAppointment = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/appointments/client/${id}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Greška pri otkazivanju termina");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Termin je otkazan.");
    },
  });

  const updateAppointmentStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      proposedDate,
      proposedTime,
      note,
      pricingAmount,
    }: {
      id: string;
      status: IAppointment["status"];
      proposedDate?: string;
      proposedTime?: string;
      note?: string;
      /** Opcioni unos cene uz promenu statusa; server odlučuje šta je to. */
      pricingAmount?: number;
    }) => {
      const updateData: Partial<IAppointment> & {
        lastUpdatedBy: string;
        pricingAmount?: number;
      } = {
        status,
        lastUpdatedBy: "admin",
        ...(pricingAmount != null ? { pricingAmount } : {}),
      };

      if (proposedDate) updateData.proposedDate = proposedDate;
      if (proposedTime) updateData.proposedTime = proposedTime;
      if (note) updateData.note = note;

      const res = await fetch(`/api/appointments/update/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error("Greška pri ažuriranju statusa termina");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Status termina ažuriran.");
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/appointments/delete/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Greška pri brisanju termina");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Termin je obrisan.");
    },
  });

  const sendMessage = useMutation({
    mutationFn: async ({
      appointmentId,
      message,
    }: {
      appointmentId: string;
      message: string;
    }) => {
      const res = await fetch("/api/appointments/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ appointmentId, message }),
      });

      if (!res.ok) throw new Error("Greška pri slanju poruke");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  return {
    createAppointment,
    updateAppointment,
    updateClientAppointment,
    cancelClientAppointment,
    deleteAppointment,
    updateAppointmentStatus,
    sendMessage,
  };
}
