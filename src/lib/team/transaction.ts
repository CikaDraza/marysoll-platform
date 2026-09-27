import "server-only";

import mongoose, { type ClientSession } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { TeamInviteError } from "./errors";

const MAX_TRANSACTION_ATTEMPTS = 5;
const MAX_COMMIT_ATTEMPTS = 3;

interface MongoFailure {
  code?: number;
  errorLabels?: string[];
  hasErrorLabel?: (label: string) => boolean;
}

function failureOf(error: unknown): MongoFailure {
  return typeof error === "object" && error !== null
    ? (error as MongoFailure)
    : {};
}

function hasLabel(error: unknown, label: string): boolean {
  const failure = failureOf(error);
  return Boolean(
    failure.hasErrorLabel?.(label) || failure.errorLabels?.includes(label),
  );
}

function isTransient(error: unknown): boolean {
  const failure = failureOf(error);
  return (
    hasLabel(error, "TransientTransactionError") ||
    failure.code === 112 ||
    failure.code === 251
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
      if (
        !hasLabel(error, "UnknownTransactionCommitResult") ||
        attempt === MAX_COMMIT_ATTEMPTS - 1
      ) {
        throw error;
      }
      await waitBeforeRetry(attempt);
    }
  }
}

export async function runTeamTransaction<T>(
  work: (session: ClientSession) => Promise<T>,
): Promise<T> {
  await connectToDB();
  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt++) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await work(session);
      await commitWithRetry(session);
      return result;
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction().catch(() => undefined);
      }
      if (error instanceof TeamInviteError || !isTransient(error)) throw error;
      if (attempt < MAX_TRANSACTION_ATTEMPTS - 1) {
        await waitBeforeRetry(attempt);
      }
    } finally {
      await session.endSession();
    }
  }
  throw new TeamInviteError(
    "TEAM_CONFLICT",
    "Previše istovremenih izmena tima. Pokušajte ponovo.",
  );
}
