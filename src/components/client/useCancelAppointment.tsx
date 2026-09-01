"use client";
/**
 * Deljeno otkazivanje termina — jedna implementacija za listu „Moji termini"
 * i za ClientEditModal.
 *
 * Ranije je otkazivanje živelo samo unutar edit modala, pa je klijentkinja
 * morala da otvori ceo obrazac za izmenu da bi otkazala termin. Sada obe
 * površine koriste isti potvrdni dijalog i istu mutaciju, pa poruka i ishod
 * ne mogu da se raziđu.
 *
 * Tekst potvrde zavisi od faze: posle roka otkazivanje postaje kasno i
 * evidentira se kao nedolazak, i to klijentkinja mora da vidi PRE potvrde.
 */
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import AlertModal from "../modals/AlertModal";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { clientAppointmentPhase } from "@/lib/appointments/cancellation";
import type { IAppointment } from "@/types";

interface Options {
  token?: string;
  /** Pozvano posle uspešnog otkazivanja (npr. zatvaranje modala). */
  onCancelled?: () => void;
}

export function useCancelAppointment({ token, onCancelled }: Options = {}) {
  const { cancelClientAppointment } = useAppointmentMutations(token);
  const [target, setTarget] = useState<IAppointment | null>(null);

  const requestCancel = useCallback((appointment: IAppointment) => {
    setTarget(appointment);
  }, []);

  const isLate = target ? clientAppointmentPhase(target) === "late" : false;

  const confirm = useCallback(async () => {
    if (!target?._id) return;
    try {
      await cancelClientAppointment.mutateAsync(target._id);
      setTarget(null);
      onCancelled?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Greška pri otkazivanju termina.",
      );
    }
  }, [target, cancelClientAppointment, onCancelled]);

  const dialog = (
    <AlertModal
      open={target !== null}
      setOpen={(open) => {
        if (!open) setTarget(null);
      }}
      onConfirm={confirm}
      title={
        isLate ? "Rok za regularno otkazivanje je prošao" : "Otkaži termin"
      }
      message={
        isLate
          ? "Ako sada otkažete termin, biće evidentiran kao kasno otkazivanje i mogu se primeniti pravila salona za nedolazak."
          : "Da li želite da otkažete termin?"
      }
      confirmLabel={isLate ? "Otkaži ipak" : "Otkaži termin"}
      cancelLabel="Odustani"
    />
  );

  return { requestCancel, dialog, isCancelling: cancelClientAppointment.isPending };
}
