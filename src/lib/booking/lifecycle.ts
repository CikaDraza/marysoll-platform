import type { ReservationStatus } from "./contracts";
import { BookingError } from "./errors";

const ACTIVE = new Set<ReservationStatus>(["pending", "confirmed"]);

function assertActive(status: ReservationStatus): void {
  if (!ACTIVE.has(status)) {
    throw new BookingError("BOOKING_INVALID_STATE", `Status ${status} nije aktivan`);
  }
}

export function lifecycleTarget(input: {
  operation: "cancel" | "reject" | "complete" | "mark_no_show";
  status: ReservationStatus;
  startsAt: Date;
  endsAt: Date;
  occurredAt: Date;
  late: boolean;
}): ReservationStatus {
  assertActive(input.status);
  if (input.operation === "cancel") return input.late ? input.status : "released";
  if (input.operation === "reject") return "released";
  if (input.occurredAt.getTime() < input.endsAt.getTime()) {
    throw new BookingError(
      "BOOKING_INVALID_STATE",
      `${input.operation} nije dozvoljen pre kraja rezervacije`,
    );
  }
  return input.operation === "complete" ? "completed" : "no_show";
}
