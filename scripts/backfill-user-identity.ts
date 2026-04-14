/**
 * scripts/backfill-user-identity.ts
 *
 * Backfills UserIdentity documents for all existing Users with
 * globalRole ∈ ["OWNER", "SUPER_ADMIN"].
 *
 * ─── How to run ───────────────────────────────────────────────────────────────
 *
 *   MONGODB_URI must be in the environment before running.
 *
 *   # Dry-run (no writes — always run this first)
 *   MONGODB_URI="..." npm run backfill:identity -- --dry-run
 *
 *   # Live run — all eligible users
 *   MONGODB_URI="..." npm run backfill:identity
 *
 *   # Test on N users
 *   MONGODB_URI="..." npm run backfill:identity -- --limit=10
 *
 *   # Debug a single user
 *   MONGODB_URI="..." npm run backfill:identity -- --email=owner@example.com
 *
 * ─── Safety guarantees ────────────────────────────────────────────────────────
 *
 *   - Idempotent: re-running never creates duplicates.
 *   - Per-user try/catch: one failure never aborts the rest.
 *   - Dry-run: zero writes, full structured logging.
 *   - Never overwrites existing identity fields.
 *   - Never crashes the entire execution on a single user failure.
 */

import mongoose from "mongoose";
// ignore type-only import of MONGODB_URI from .env.local since this script is meant to be run with MONGODB_URI in the environment
import { User } from "../src/models/User";
import { UserIdentity } from "../src/models/UserIdentity";
import type { Types } from "mongoose";

// Inline connection — avoids importing src/lib/db/mongodb which pulls in
// the Next.js-only "server-only" package unavailable outside the framework.
async function connectScript(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in environment");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, {
      dbName: process.env.DB_NAME ?? "marysoll_db",
    });
  }
}

// ─── CLI flags ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

const DRY_RUN = args.includes("--dry-run");

const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

const emailArg = args.find((a) => a.startsWith("--email="));
const FILTER_EMAIL = emailArg
  ? emailArg.split("=")[1].toLowerCase().trim()
  : null;

// ─── Lean user shape ──────────────────────────────────────────────────────────

interface LeanUser {
  _id: Types.ObjectId;
  email: string;
  password: string;
  isEmailVerified: boolean;
  globalRole: string;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  await connectScript();

  console.error(
    JSON.stringify({
      event: "BACKFILL_START",
      action: DRY_RUN ? "dry-run" : "live",
      status: "info",
      dryRun: DRY_RUN,
      limit: LIMIT ?? "none",
      email: FILTER_EMAIL ?? "all",
    }),
  );

  // ── Build query ──────────────────────────────────────────────────────────────

  const query: Record<string, unknown> = {
    globalRole: { $in: ["OWNER", "SUPER_ADMIN"] },
  };
  if (FILTER_EMAIL) {
    query.email = FILTER_EMAIL;
  }

  let userQuery = User.find(query)
    .select("_id email password isEmailVerified globalRole")
    .lean<LeanUser[]>();

  if (LIMIT !== null && !isNaN(LIMIT) && LIMIT > 0) {
    userQuery = userQuery.limit(LIMIT) as typeof userQuery;
  }

  const users = await userQuery;

  // ── Counters ──────────────────────────────────────────────────────────────────

  let processed = 0;
  let created = 0;
  let linked = 0;
  let skipped = 0;
  let conflicts = 0;
  let errors = 0;

  // ── Per-user loop ─────────────────────────────────────────────────────────────

  for (const user of users) {
    processed++;

    try {
      // ── STEP 1: Skip if already linked ────────────────────────────────────────

      const existingByLegacyId = await UserIdentity.findOne({
        legacyUserId: user._id,
      })
        .select("_id")
        .lean();

      if (existingByLegacyId) {
        console.error(
          JSON.stringify({
            event: "SKIP_ALREADY_LINKED",
            userId: user._id,
            email: user.email,
            action: "skip — UserIdentity already linked via legacyUserId",
            status: "skip",
          }),
        );
        skipped++;
        continue;
      }

      // ── STEP 2: Check existing identity by email ──────────────────────────────

      const existingByEmail = await UserIdentity.findOne({ email: user.email })
        .select("_id legacyUserId")
        .lean<{ _id: Types.ObjectId; legacyUserId: Types.ObjectId | null }>();

      if (existingByEmail) {
        if (existingByEmail.legacyUserId == null) {
          // CASE A — identity exists, no legacyUserId → link it
          if (!DRY_RUN) {
            await UserIdentity.findOneAndUpdate(
              { _id: existingByEmail._id },
              { legacyUserId: user._id },
            );
          }
          console.error(
            JSON.stringify({
              event: "LINK_EXISTING_IDENTITY",
              userId: user._id,
              email: user.email,
              action: DRY_RUN
                ? "[dry-run] would link existing unlinked UserIdentity"
                : "linked existing unlinked UserIdentity",
              status: "success",
            }),
          );
          linked++;
        } else {
          // CASE B — identity exists, DIFFERENT legacyUserId → conflict
          console.error(
            JSON.stringify({
              event: "DUPLICATE_EMAIL_CONFLICT",
              userId: user._id,
              email: user.email,
              action:
                "skip — email already claimed by a different legacyUserId",
              status: "skip",
            }),
          );
          conflicts++;
        }
        continue;
      }

      // ── STEP 3: Create new UserIdentity ───────────────────────────────────────
      // CASE C — no identity exists by email → create

      if (!DRY_RUN) {
        await UserIdentity.create({
          email: user.email,
          passwordHash: user.password, // already bcrypt-hashed — do NOT re-hash
          isEmailVerified: user.isEmailVerified,
          platformRole:
            user.globalRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : "OWNER",
          legacyUserId: user._id,
        });
      }

      console.error(
        JSON.stringify({
          event: "CREATED_IDENTITY",
          userId: user._id,
          email: user.email,
          action: DRY_RUN
            ? "[dry-run] would create UserIdentity"
            : "created UserIdentity",
          status: "success",
        }),
      );
      created++;
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "ERROR",
          userId: user._id,
          email: user.email,
          action: err instanceof Error ? err.message : String(err),
          status: "error",
        }),
      );
      errors++;
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────────

  console.error(
    JSON.stringify({
      event: "BACKFILL_COMPLETE",
      action: DRY_RUN
        ? "dry-run complete — no writes performed"
        : "live run complete",
      status: "info",
      processed,
      created,
      linked,
      skipped,
      conflicts,
      errors,
    }),
  );
}

// ─── Execution wrapper ────────────────────────────────────────────────────────

(async () => {
  try {
    await run();
    process.exit(0);
  } catch (fatalErr) {
    console.error(
      JSON.stringify({
        event: "FATAL_ERROR",
        action: fatalErr instanceof Error ? fatalErr.message : String(fatalErr),
        status: "error",
      }),
    );
    process.exit(1);
  }
})();
