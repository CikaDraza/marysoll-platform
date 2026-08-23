import type {
  BookingCommandResult,
  BookingOperationType,
} from "./contracts";
import { BookingError } from "./errors";
import { replayReceipt } from "./persistence";
import { isDuplicateIndex } from "./transaction";

export async function executeIdempotently(input: {
  tenantId: string;
  operationType: BookingOperationType;
  idempotencyKey: string;
  fingerprint: string;
  execute: () => Promise<BookingCommandResult>;
}): Promise<BookingCommandResult> {
  if (!input.idempotencyKey.trim()) {
    throw new BookingError(
      "BOOKING_IDEMPOTENCY_CONFLICT",
      "Idempotency ključ je obavezan",
    );
  }
  const replay = await replayReceipt(input);
  if (replay) return replay;
  try {
    return await input.execute();
  } catch (error) {
    if (isDuplicateIndex(error, "booking_operation_receipt_unique")) {
      const racedReplay = await replayReceipt(input);
      if (racedReplay) return racedReplay;
    }
    if (error instanceof BookingError) throw error;
    throw new BookingError(
      "BOOKING_INFRASTRUCTURE_UNAVAILABLE",
      "Booking persistence trenutno nije dostupna",
    );
  }
}
