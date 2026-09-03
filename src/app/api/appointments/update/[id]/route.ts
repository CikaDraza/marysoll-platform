// src/app/api/appointments/update/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { IAppointmentPricing } from "@/types";
import { applyQuote, emptyPricingSnapshot } from "@/lib/appointments/pricingSnapshot";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { resolveTenant, verifyToken } from "@/lib/auth/auth-server";
import { actorScopeFrom, logSuperAdminAccess } from "@/lib/auth/tenantScope";
import { createAppointmentNotification } from "@/lib/notificationService";
import { loyaltyOnAppointmentStatusChange } from "@/lib/loyalty/hooks";
import {
  BENEFIT_CLEAR_UNSET,
  planBenefitRecompute,
  releaseRecomputedVoucher,
} from "@/lib/loyalty/redemption";
import { completeAppointmentCheckout } from "@/lib/appointments/checkout";
import { LoyaltyRedemptionError, loyaltyErrorStatus } from "@/lib/loyalty/errors";
import { IAppointment, IAppointmentService } from "@/types";
import { Types } from "mongoose";
import { requireCapability } from "@/lib/platform/capabilities-server";
import {
  resolveCanonicalSelection,
  selectionFromAppointmentItem,
  signatureOfAppointmentItem,
} from "@/lib/appointments/canonicalSelection";
import { BookingError } from "@/lib/booking/errors";
import { ACTIVE_APPOINTMENT_STATUS_FILTER } from "@/lib/appointments/occupancy";
import {
  CLEAR_PROPOSAL_UNSET,
  evaluateProposalDecision,
} from "@/lib/appointments/proposal";

interface UpdateAppointmentData {
  status?:
    | "pending"
    | "appointment_approved"
    | "appointment_rejected"
    | "appointment_rescheduled"
    | "appointment_cancelled"
    | "completed"
    | "no_show";
  proposedDate?: string;
  proposedTime?: string;
  date?: string;
  time?: string;
  note?: string;
  lastUpdatedBy?: "client" | "admin";
  /** Canonical snapshot cene — SERVER ga postavlja, browser nikad. */
  pricing?: IAppointmentPricing;
  cancelledAt?: Date;
  cancelledBy?: "client" | "admin";
  cancellationType?: "legitimate" | "late";
  noShowMarkedAt?: Date;
  noShowReason?: "late_cancel" | "missed_appointment" | "admin_marked";
  /** Canonical stavke — SERVER ih prepisuje iz kataloga, browser ih ne bira. */
  services?: IAppointmentService[];
  serviceName?: string;
  duration?: number;
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  await connectToDB();

  const { id } = await context.params;

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // Izolacija: token kaže SAMO ko je pozivalac, ne i čiji je termin. Ranije je
    // `findById(id)` značio da svaki ulogovan korisnik može da izmeni bilo koji
    // termin na platformi ako mu zna `_id` — i tuđeg salona i tuđeg klijenta.
    const scope = actorScopeFrom(decoded);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }
    if (scope.isSuperAdmin) {
      logSuperAdminAccess(
        "SUPERADMIN_UNSCOPED_APPOINTMENT_UPDATE",
        decoded,
        req.url,
      );
    }
    if (!scope.isSuperAdmin) {
      const denied = await requireCapability(decoded.tenantId, "booking.services");
      if (denied) return denied;
    }

    const tenant = await resolveTenant(req);

    if (tenant) {
      const isActive =
        tenant.verified === true &&
        (tenant.paid === true || tenant.isTrialActive === true);

      if (!isActive) {
        return NextResponse.json(
          {
            error:
              "Salon nije aktivan. Zakazivanje nije moguće. Proverite pretplatu ili trial period.",
          },
          { status: 403 },
        );
      }
    }

    const updatedData: UpdateAppointmentData = await req.json();

    // Growth Studio polja se menjaju isključivo kroz loyalty servis —
    // nikad direktno kroz ovaj update (payload ide u findByIdAndUpdate).
    const raw = updatedData as Record<string, unknown>;
    delete raw.appliedVoucherId;
    delete raw.appliedPromotionId;
    delete raw.originalPrice;
    delete raw.discountAmount;
    delete raw.finalPrice;
    delete raw.completedAt;
    delete raw.completionSource;
    delete raw.completionPromptSentAt;
    delete raw.loyaltyProcessed;
    // Cena se menja isključivo kroz `pricingAmount` ispod — sirov `pricing`
    // iz browsera se nikad ne upisuje, inače bi klijent mogao da podmetne
    // ceo snapshot (uključujući `chargedAmount`).
    delete raw.pricing;

    const appointment = await Appointment.findOne({ _id: id, ...scope.filter });

    if (!appointment) {
      return NextResponse.json(
        { error: "Termin nije pronađen" },
        { status: 404 },
      );
    }

    // Privilegije se čitaju iz SCOPE-a, ne iz golog tokena: `decoded.isAdmin`
    // znači „admin je negde", a scope znači „admin je nad OVIM terminom".
    const isAdmin = scope.actor !== "client";

    // Completion i no-show su isključivo admin akcije (od njih zavisi
    // dodela loyalty nagrada — klijent ne sme sam da "završi" termin).
    if (
      !isAdmin &&
      (updatedData.status === "completed" || updatedData.status === "no_show")
    ) {
      return NextResponse.json(
        { error: "Samo salon može označiti termin kao završen ili propušten" },
        { status: 403 },
      );
    }

    // Postavi ko je poslednji ažurirao
    updatedData.lastUpdatedBy = isAdmin ? "admin" : "client";
    if (isAdmin && updatedData.status === "appointment_cancelled") {
      updatedData.cancelledAt = new Date();
      updatedData.cancelledBy = "admin";
      updatedData.cancellationType = "legitimate";
    }
    // ── Salon unosi cenu ──────────────────────────────────────────────────
    // Dva trenutka: pri odobravanju (procena po fotografiji) i pri označavanju
    // dolaska (stvarno naplaćeno). Oba su OPCIONA — ako salon preskoči,
    // termin ostaje bez cene i ulazi u „Termini bez cene", ne u prihod.
    const pricingAmount = (updatedData as { pricingAmount?: unknown })
      .pricingAmount;
    delete (updatedData as { pricingAmount?: unknown }).pricingAmount;

    if (isAdmin && pricingAmount != null) {
      const amount = Number(pricingAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        return NextResponse.json(
          { error: "Cena mora biti broj veći ili jednak nuli." },
          { status: 400 },
        );
      }
      const base = appointment.pricing ?? emptyPricingSnapshot();
      // Pri odobravanju vlasnica unosi OSNOVNU cenu, pa server sam dodaje
      // poznate doplate. Slučaj „Došla" (stvarno naplaćeno) više ne prolazi
      // ovuda — ide kroz checkout seam ispod, koji uz cenu radi i recompute
      // pogodnosti i atomic prelaz statusa.
      //
      // Snapshot ide u `updatedData`, dakle u ISTI atomic upis kao status.
      // Ranije se menjao samo učitani dokument bez `save()`, pa je cena
      // stizala u mejl a nikad u bazu.
      updatedData.pricing = applyQuote(base, amount, decoded.tenantUserId ?? null);
    }

    // ── Završetak ide kroz JEDAN canonical checkout seam ─────────────────
    // Ne sme da postoji „aritmetika rute A" i „aritmetika rute B": i ova ruta
    // i novi Checkout ekran i auto-complete cron dele isti obračun pogodnosti,
    // isto pravilo o stvarno naplaćenom i isti atomic prelaz statusa.
    //
    // Ulaz je namerno nepromenjen: `AdminAppointments` i dalje šalje
    // `{ status: "completed", pricingAmount }`, gde je `pricingAmount` ukupno
    // naplaćeno.
    if (isAdmin && updatedData.status === "completed") {
      try {
        await completeAppointmentCheckout({
          appointmentId: id,
          actor: {
            tenantId: String(appointment.tenantId),
            adminTenantUserId: decoded.tenantUserId ?? null,
          },
          amounts:
            typeof pricingAmount === "number" || typeof pricingAmount === "string"
              ? { chargedAmount: Number(pricingAmount) }
              : undefined,
          source: "admin",
        });
      } catch (error) {
        if (error instanceof LoyaltyRedemptionError) {
          return NextResponse.json(
            { error: error.message },
            { status: loyaltyErrorStatus(error) },
          );
        }
        throw error;
      }
      const completed = await Appointment.findOne({ _id: id, ...scope.filter });
      return NextResponse.json(completed);
    }

    if (isAdmin && updatedData.status === "no_show") {
      updatedData.noShowMarkedAt = new Date();
      updatedData.noShowReason = "admin_marked";
    }

    // ── Izmena izbora usluge ─────────────────────────────────────────────
    // Ruta je do sada `services`, `duration` i `price` upisivala tačno onako
    // kako ih je poslao browser — AdminEditModal je sam računao cenu i
    // trajanje. Sada ide kroz istu kapiju kao zakazivanje: usluga se učitava
    // TENANT-SCOPED, a trajanje i cena dolaze iz kataloga.
    const incomingItem = updatedData.services?.[0];
    if (incomingItem?.serviceId) {
      let canonical;
      try {
        canonical = await resolveCanonicalSelection({
          tenantId: String(appointment.tenantId),
          serviceId: String(incomingItem.serviceId),
          selection: selectionFromAppointmentItem(incomingItem),
          displayName: updatedData.serviceName,
        });
      } catch (err) {
        return NextResponse.json(
          {
            error:
              err instanceof BookingError
                ? err.message
                : "Izbor usluge nije validan.",
          },
          { status: 400 },
        );
      }

      // Cena prati IZBOR: promena termina u kalendaru ne sme da obriše cenu
      // koju je salon već potvrdio, promena usluge mora.
      const selectionChanged =
        signatureOfAppointmentItem(appointment.services?.[0]) !==
        canonical.signature;

      updatedData.services = [canonical.item];
      updatedData.serviceName = canonical.serviceName;
      updatedData.duration = canonical.durationMinutes;
      if (
        (selectionChanged || !appointment.pricing) &&
        updatedData.pricing == null
      ) {
        updatedData.pricing = canonical.pricing;
      }
    }

    // ── Zauzeće pri admin izmeni ─────────────────────────────────────────
    // Admin sme SVESNO da preklopi termine (odluka 2026-07-04, ista sloboda
    // kao pri zakazivanju), ali ne sme da NESVESNO prepiše tuđi: izmena na
    // tačno isti datum i vreme drugog aktivnog termina se odbija — do sada
    // ova ruta nije imala nijednu proveru.
    const movingTo = {
      date: updatedData.date ?? appointment.date,
      time: updatedData.time ?? appointment.time,
    };
    const movesInCalendar =
      movingTo.date !== appointment.date || movingTo.time !== appointment.time;
    if (isAdmin && movesInCalendar) {
      const taken = await Appointment.findOne({
        _id: { $ne: appointment._id },
        tenantId: appointment.tenantId,
        date: movingTo.date,
        time: movingTo.time,
        status: ACTIVE_APPOINTMENT_STATUS_FILTER,
      })
        .select("_id")
        .lean();
      if (taken) {
        return NextResponse.json(
          { error: "U tom terminu već postoji zakazan termin." },
          { status: 409 },
        );
      }
    }

    // ── Predlog novog termina ────────────────────────────────────────────
    // Predlog NE rezervišе slot: `date`/`time` ostaju stari sve dok
    // klijentkinja ne prihvati. Zato se ovde ništa ne proverava — provera je
    // u trenutku prihvatanja, kada se zna da li je slot još slobodan.
    let clearProposal = false;
    if (updatedData.proposedDate && updatedData.proposedTime && isAdmin) {
      updatedData.status = "appointment_rescheduled";
    }

    // ── Odluka o predlogu ────────────────────────────────────────────────
    // Prihvatanje je JEDINI trenutak u kojem predlog postaje zauzeće, pa je
    // ovo i jedino mesto gde se proverava dostupnost. Ranije je prihvatanje
    // slepo prepisivalo `date`/`time` — dva termina su mogla da završe u
    // istom slotu ako je slot popunjen između predloga i odgovora.
    const decidesProposal =
      Boolean(appointment.proposedDate && appointment.proposedTime) &&
      (updatedData.status === "appointment_approved" ||
        updatedData.status === "pending");

    // Klijentkinja sme da menja status SAMO kao odgovor na predlog salona.
    // Bez ovoga je `{"status":"appointment_approved"}` nad sopstvenim terminom
    // bio samo-odobravanje: zakazan termin bi zaobišao potvrdu salona.
    if (!isAdmin && updatedData.status && !decidesProposal) {
      return NextResponse.json(
        { error: "Status termina menja salon." },
        { status: 403 },
      );
    }

    if (decidesProposal) {
      const decision =
        updatedData.status === "appointment_approved" ? "accept" : "reject";
      const outcome = await evaluateProposalDecision(appointment, decision);

      if (!outcome.ok) {
        return NextResponse.json(
          { error: outcome.error },
          { status: outcome.kind === "conflict" ? 409 : 400 },
        );
      }

      clearProposal = true;
      if (outcome.kind === "accepted") {
        updatedData.date = outcome.date;
        updatedData.time = outcome.time;
      }

      // Odluku javljamo SALONU — on je poslao predlog i on čeka odgovor.
      // Ovde je ranije stajalo `recipientProfileId: clientProfileId`: poruka
      // „Klijent je prihvatio termin" stizala je samoj klijentkinji, a salon
      // nije saznao ništa.
      await notifyProposalDecision(
        appointment,
        outcome.kind === "accepted"
          ? { decision: "approved", date: outcome.date, time: outcome.time }
          : { decision: "rejected" },
      );
    }

    // ── Pogodnost prati cenu i uslugu ────────────────────────────────────
    // Vaučer je PRAVILO popusta i pri rezervaciji ne mora znati cenu. Čim
    // osnovica postane poznata (salon potvrdio cenu) ili se promeni (druga
    // usluga), dinarski iznos mora ponovo da se izračuna NA SERVERU — do sada
    // je vaučer na terminu „na upit" ostajao sa `null` iznosima zauvek.
    //
    // Recompute gleda PROJEKTOVANO stanje: cenu i uslugu koje termin dobija
    // ovim upisom, ne one koje je imao.
    const benefitPlan = await planBenefitRecompute({
      appliedVoucherId: appointment.appliedVoucherId,
      pricing: updatedData.pricing ?? appointment.pricing,
      services: updatedData.services ?? appointment.services,
    });

    const benefitUnset =
      benefitPlan.kind === "released" ? BENEFIT_CLEAR_UNSET : undefined;

    const updated = await Appointment.findOneAndUpdate(
      { _id: id, ...scope.filter },
      {
        ...updatedData,
        ...(benefitPlan.set ?? {}),
        // `{ proposedDate: undefined }` Mongoose izbacuje iz update-a, pa je
        // predlog preživljavao odluku i klijentkinja je i dalje gledala
        // „Prihvati / Odbij". Brisanje mora biti eksplicitan `$unset`.
        ...(clearProposal || benefitUnset
          ? {
              $unset: {
                ...(clearProposal ? CLEAR_PROPOSAL_UNSET : {}),
                ...(benefitUnset ?? {}),
              },
            }
          : {}),
      },
      { new: true },
    );

    // Vaučer se oslobađa TEK pošto je termin upisan: obrnut redosled bi na
    // padu upisa ostavio termin koji pokazuje na vaučer u tuđem novčaniku.
    await releaseRecomputedVoucher(benefitPlan);

    // Notifikacija za promenu statusa. Odluka o predlogu je već poslala svoju
    // (i to SALONU) — bez ovog izuzetka bi klijentkinja povrh sopstvene akcije
    // dobila još i „Vaš termin je odobren".
    if (
      !decidesProposal &&
      updatedData.status &&
      updatedData.status !== appointment.status
    ) {
      // Tenant se uzima IZ TERMINA: host-resolved tenant je null na admin
      // hostu (nema `x-tenant-slug`), pa je notifikacija nastajala bez tenanta.
      // `updated` je ono što je stvarno u bazi — mejl ne sme da tvrdi cenu
      // koja nije upisana.
      await handleStatusChangeNotification(
        updated ?? appointment,
        updatedData.status,
        appointment.tenantId,
      );

      // Growth Studio: dodela/povlačenje nagrada + voucher lifecycle
      // (nikad ne baca — loyalty ne sme da sruši ažuriranje termina)
      await loyaltyOnAppointmentStatusChange(
        id,
        appointment.status,
        updatedData.status,
        { source: "admin" },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Greška pri ažuriranju termina" },
      { status: 500 },
    );
  }
}

/**
 * Odluka klijentkinje o predlogu → notifikacija SALONU (zvonce + push + mejl).
 *
 * Ide kroz `createAppointmentNotification` sa `sender: "client"`, jer je to
 * jedina putanja koja zna da adresira sve admine salona. Ručni
 * `Notification.create` koji je ovde stajao pisao je samo red u bazi, i to
 * pogrešnom primaocu.
 */
async function notifyProposalDecision(
  appointment: IAppointment,
  outcome:
    | { decision: "approved"; date: string; time: string }
    | { decision: "rejected" },
) {
  try {
    await createAppointmentNotification(
      {
        _id: appointment._id?.toString() || "",
        tenantId: appointment.tenantId!,
        clientProfileId: appointment.clientProfileId?.toString() || "",
        clientName: appointment.clientName || "Klijent",
        clientEmail: appointment.clientEmail,
        serviceName: appointment.serviceName,
        // Kod prihvatanja termin je NOVI — salon mora videti dogovoreno vreme.
        date: outcome.decision === "approved" ? outcome.date : appointment.date,
        time: outcome.decision === "approved" ? outcome.time : appointment.time,
        note: appointment.note,
      },
      // Oba ishoda idu kao "rescheduled": odbijen predlog NIJE otkazan termin
      // — termin ostaje na starom vremenu i klijentkinja i dalje dolazi.
      "rescheduled",
      {
        sender: "client",
        proposalDecision:
          outcome.decision === "approved" ? "accepted" : "declined",
        message:
          outcome.decision === "approved"
            ? "Klijent je prihvatio predloženi termin."
            : "Klijent je odbio predloženi termin. Termin ostaje na starom vremenu.",
      },
    );
  } catch (error) {
    console.error("❌ Error notifying proposal decision:", error);
  }
}

async function handleStatusChangeNotification(
  appointment: IAppointment,
  newStatus:
    | "pending"
    | "appointment_approved"
    | "appointment_rejected"
    | "appointment_rescheduled"
    | "appointment_cancelled"
    | "completed"
    | "no_show",
  tenantId: Types.ObjectId | string,
) {
  const statusToNotificationType: Record<
    string,
    "approved" | "rejected" | "rescheduled" | "cancelled"
  > = {
    appointment_approved: "approved",
    appointment_rejected: "rejected",
    appointment_rescheduled: "rescheduled",
    appointment_cancelled: "cancelled",
  };

  const notificationType = statusToNotificationType[newStatus];
  if (!notificationType) return;

  const clientName = appointment.clientName || "Klijent";

  try {
    await createAppointmentNotification(
      {
        _id: appointment._id?.toString() || "",
        tenantId,
        clientProfileId: appointment.clientProfileId?.toString() || "",
        clientName: clientName,
        serviceName: appointment.serviceName,
        date: appointment.date,
        time: appointment.time,
        note: appointment.note,
        // Odobrenje sa unetom cenom — klijentkinja odmah dobija mejl u kojem
        // cena više nije „na upit". Čita se iz PERSISTOVANOG dokumenta.
        pricing: appointment.pricing ?? null,
      },
      notificationType,
      {
        sender: "admin",
        message: `Status termina je promenjen u ${newStatus}`,
      },
    );
  } catch (error) {
    console.error(`❌ Error creating notification:`, error);
  }
}
