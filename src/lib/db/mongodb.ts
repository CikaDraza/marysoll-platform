/**
 * lib/db/mongodb.ts
 *
 * SERVER-ONLY — nikad ne importovati u Client Components ili hooks!
 * Mongoose konekcija sa connection pooling (cached singleton).
 */
import "server-only";

import mongoose from "mongoose";

// Staging izolacija (fail-closed): staging build ima NEXT_PUBLIC_BASE_DOMAIN=staging.*
// i MORA da koristi zasebnu bazu (MONGODB_STAGING_URI) — nikad produkcijsku, jer se
// na staging-u testira destruktivan flow (merge naloga). Prod build NIKAD ne čita
// STAGING URI. Ako je staging a MONGODB_STAGING_URI nije postavljen → baci (ne pada
// nazad na prod).
const IS_STAGING = (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "").startsWith(
  "staging.",
);
const MONGODB_URI = IS_STAGING
  ? process.env.MONGODB_STAGING_URI ?? ""
  : process.env.MONGODB_URI ?? "";
const DB_NAME = process.env.DB_NAME || "marysoll_db";

if (!MONGODB_URI) {
  throw new Error(
    IS_STAGING
      ? "MONGODB_STAGING_URI nije definisan (staging deployment ne sme na prod bazu)"
      : "MONGODB_URI nije definisan u environment variables",
  );
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
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
        maxPoolSize: 5,
        minPoolSize: 0,

        serverSelectionTimeoutMS: 5000,
      })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
