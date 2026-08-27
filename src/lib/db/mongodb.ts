/**
 * lib/db/mongodb.ts
 *
 * SERVER-ONLY — nikad ne importovati u Client Components ili hooks!
 * Mongoose konekcija sa connection pooling (cached singleton).
 */
import "server-only";

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "";
/**
 * Ime baze dolazi iz URI-ja, ne iz koda.
 *
 * `dbName` opcija NADJACAVA ime baze iz connection stringa. Dok je ovde stajao
 * fallback `|| "marysoll_db"`, svaki deployment se spajao na produkcijsku bazu
 * bez obzira sta URI kaze — tiho, bez greske. Zato fallback-a nema: `dbName` se
 * prosledjuje SAMO ako je DB_NAME eksplicitno postavljen.
 *
 * Produkcijski i staging URI oba nose ime baze u putanji
 * (…mongodb.net/marysoll_db?… odnosno …/staging-marysoll_db?…).
 */
const DB_NAME = process.env.DB_NAME;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI nije definisan u environment variables");
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
        ...(DB_NAME ? { dbName: DB_NAME } : {}),
        maxPoolSize: 5,
        minPoolSize: 0,

        serverSelectionTimeoutMS: 5000,
      })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
