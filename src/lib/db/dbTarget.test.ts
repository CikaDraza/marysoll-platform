import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

/**
 * NA KOJU SE BAZU STVARNO SPAJAMO.
 *
 * Ovo nije stilsko pravilo nego zaštita od tihe greške: dok je u kodu stajalo
 *
 *     const DB_NAME = process.env.DB_NAME || "marysoll_db";
 *     mongoose.connect(MONGODB_URI, { dbName: DB_NAME, … });
 *
 * svaki deployment se spajao na PRODUKCIJSKU bazu bez obzira šta URI kaže —
 * bez greške, bez upozorenja. Staging bi izgledao podešeno i pisao u produkciju.
 *
 * Ime baze zato dolazi iz URI-ja, a `dbName` se prosleđuje samo kad je
 * `DB_NAME` eksplicitno postavljen.
 */
describe("ime baze dolazi iz URI-ja", () => {
  let mongod: MongoMemoryServer;
  let base: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    base = mongod.getUri().replace(/\/?$/, "/");
  }, 60_000);

  afterEach(async () => {
    await mongoose.disconnect();
  });

  afterAll(async () => {
    await mongod.stop();
  });

  it("bez `dbName` opcije poštuje se baza iz URI-ja", async () => {
    await mongoose.connect(base + "staging-marysoll_db", {});
    expect(mongoose.connection.name).toBe("staging-marysoll_db");
  });

  it("ista konekcija sa produkcijskim imenom u URI-ju ide u produkcijsku bazu", async () => {
    await mongoose.connect(base + "marysoll_db", {});
    expect(mongoose.connection.name).toBe("marysoll_db");
  });

  it("`dbName` NADJAČAVA URI — zato se prosleđuje samo namerno", async () => {
    // Ovo je ponašanje zbog kog je fallback bio opasan. Test ga fiksira da
    // niko ne pomisli da je URI jači.
    await mongoose.connect(base + "staging-marysoll_db", {
      dbName: "marysoll_db",
    });
    expect(mongoose.connection.name).toBe("marysoll_db");
  });

  it("eksplicitan `DB_NAME` i dalje radi kad ga neko svesno zada", async () => {
    await mongoose.connect(base + "marysoll_db", { dbName: "neka-treca" });
    expect(mongoose.connection.name).toBe("neka-treca");
  });
});

/**
 * Izvorni čuvar — hvata povratak opasnog obrasca u bilo kom fajlu, ne samo u
 * onima koje danas znamo.
 */
describe("nijedan fajl ne vraća tvrdo kodiranu bazu", () => {
  const ROOTS = ["src", "scripts"];
  const SKIP_DIRS = new Set(["node_modules", ".next", "__probe"]);

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full, out);
        continue;
      }
      if (!/\.(ts|tsx|mts|mjs|js)$/.test(entry)) continue;
      // Ovaj fajl i sam navodi obrazac u komentaru.
      if (full.endsWith("dbTarget.test.ts")) continue;
      out.push(full);
    }
    return out;
  }

  const files = ROOTS.flatMap((r) => walk(join(process.cwd(), r)));

  it("nema `DB_NAME || \"marysoll_db\"` fallback-a", () => {
    const offenders = files.filter((f) =>
      /DB_NAME\s*(\|\||\?\?)\s*["'`]marysoll_db["'`]/.test(
        readFileSync(f, "utf8"),
      ),
    );
    expect(offenders).toEqual([]);
  });

  /**
   * Razlika koju detektor mora da vidi:
   *
   *   LOŠE   connect(URI, { dbName: DB_NAME, … })      ← objekat je direktno opcija
   *   DOBRO  connect(URI, DB_NAME ? { dbName } : {})   ← iza `?`, uslovno
   *   DOBRO  ...(DB_NAME ? { dbName: DB_NAME } : {})   ← iza `?`, u spread-u
   *
   * Zato se traži `{` kome prethodi zarez ili otvorena zagrada, a NE upitnik.
   */
  const UNCONDITIONAL = /[,(]\s*\{\s*dbName:\s*DB_NAME\s*[,}]/;

  it("nema bezuslovnog `dbName:` u pozivu konekcije", () => {
    const offenders = files.filter((f) =>
      UNCONDITIONAL.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("detektor stvarno hvata — sintetički prekršaj se prijavljuje", () => {
    const bad = 'const DB_NAME = process.env.DB_NAME || "marysoll_db";';
    expect(/DB_NAME\s*(\|\||\?\?)\s*["'`]marysoll_db["'`]/.test(bad)).toBe(true);

    expect(
      UNCONDITIONAL.test("mongoose.connect(URI, { dbName: DB_NAME, maxPoolSize: 5 })"),
    ).toBe(true);

    expect(
      UNCONDITIONAL.test("mongoose.connect(URI, DB_NAME ? { dbName: DB_NAME } : {})"),
    ).toBe(false);

    expect(
      UNCONDITIONAL.test("...(DB_NAME ? { dbName: DB_NAME } : {}),"),
    ).toBe(false);
  });

  it("skenira stvaran skup fajlova, nije prazan prolaz", () => {
    expect(files.length).toBeGreaterThan(50);
  });
});
