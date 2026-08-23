import type { ClientSession } from "mongoose";
import { BookingDayLock } from "@/models/BookingDayLock";

export interface BookingLockKey {
  tenantId: string;
  resourceKey: string;
  localDate: string;
}

function serializedKey(key: BookingLockKey): string {
  return `${key.tenantId}\u0000${key.resourceKey}\u0000${key.localDate}`;
}

export function sortBookingLocks(keys: BookingLockKey[]): BookingLockKey[] {
  const unique = new Map(keys.map((key) => [serializedKey(key), key]));
  return [...unique.values()].sort((left, right) =>
    serializedKey(left).localeCompare(serializedKey(right)),
  );
}

export async function touchBookingLocks(
  keys: BookingLockKey[],
  session: ClientSession,
): Promise<void> {
  for (const key of sortBookingLocks(keys)) {
    await BookingDayLock.findOneAndUpdate(
      key,
      {
        $inc: { version: 1 },
        $set: { updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, session, new: true },
    );
  }
}
