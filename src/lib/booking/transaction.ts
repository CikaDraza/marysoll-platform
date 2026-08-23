import mongoose, { type ClientSession } from "mongoose";
import { BookingError } from "./errors";

interface MongoFailure {
  code?: number;
  message?: string;
  keyPattern?: Record<string, number>;
  errorLabels?: string[];
  hasErrorLabel?: (label: string) => boolean;
}

const MAX_TRANSACTION_ATTEMPTS = 4;
const MAX_COMMIT_ATTEMPTS = 3;

function mongoFailure(error: unknown): MongoFailure {
  return typeof error === "object" && error !== null ? (error as MongoFailure) : {};
}

export function isDuplicateIndex(error: unknown, indexName: string): boolean {
  const failure = mongoFailure(error);
  if (failure.code !== 11000) return false;
  if (failure.message?.includes(indexName)) return true;
  const keys = Object.keys(failure.keyPattern ?? {}).sort().join(",");
  if (indexName === "booking_day_lock_unique") {
    return keys === "localDate,resourceKey,tenantId";
  }
  if (indexName === "booking_operation_receipt_unique") {
    return keys === "idempotencyKey,operationType,tenantId";
  }
  return false;
}

function hasLabel(error: unknown, label: string): boolean {
  const failure = mongoFailure(error);
  return Boolean(
    failure.hasErrorLabel?.(label) || failure.errorLabels?.includes(label),
  );
}

function isTransactionRetry(error: unknown): boolean {
  const failure = mongoFailure(error);
  return (
    hasLabel(error, "TransientTransactionError") ||
    failure.code === 112 ||
    failure.code === 251 ||
    isDuplicateIndex(error, "booking_day_lock_unique")
  );
}

function waitBeforeRetry(attempt: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 8);
  return new Promise((resolve) => setTimeout(resolve, 8 * 2 ** attempt + jitter));
}

async function commitWithRetry(session: ClientSession): Promise<void> {
  for (let attempt = 0; attempt < MAX_COMMIT_ATTEMPTS; attempt++) {
    try {
      await session.commitTransaction();
      return;
    } catch (error) {
      if (!hasLabel(error, "UnknownTransactionCommitResult") || attempt === MAX_COMMIT_ATTEMPTS - 1) {
        throw error;
      }
      await waitBeforeRetry(attempt);
    }
  }
}

export async function runBookingTransaction<T>(
  work: (session: ClientSession) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt++) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await work(session);
      await commitWithRetry(session);
      return result;
    } catch (error) {
      lastError = error;
      if (session.inTransaction()) await session.abortTransaction().catch(() => undefined);
      if (error instanceof BookingError || !isTransactionRetry(error)) throw error;
      if (attempt < MAX_TRANSACTION_ATTEMPTS - 1) await waitBeforeRetry(attempt);
    } finally {
      await session.endSession();
    }
  }

  const failure = mongoFailure(lastError);
  if (failure.code === 112 || isDuplicateIndex(lastError, "booking_day_lock_unique")) {
    throw new BookingError("BOOKING_CONFLICT", "Konkurentna booking izmena nije uspela");
  }
  throw new BookingError(
    "BOOKING_INFRASTRUCTURE_UNAVAILABLE",
    "Booking persistence trenutno nije dostupna",
  );
}
