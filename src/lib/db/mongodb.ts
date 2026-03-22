/**
 * lib/db/mongodb.ts
 *
 * SERVER-ONLY — nikad ne importovati u Client Components ili hooks!
 * Mongoose konekcija sa connection pooling (cached singleton).
 */
import "server-only";

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "";
const DB_NAME = process.env.DB_NAME || "marysoll_db";

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI nije definisan u environment variables");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? {
  conn: null,
  promise: null,
};

global._mongooseCache = cached;

export async function connectToDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        dbName: DB_NAME,
      })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
