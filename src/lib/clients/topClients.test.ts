/**
 * Client 360 — klijent čiji se dosije gleda MORA biti na listi.
 *
 * Tabela bez njega odgovara na pitanje koje niko nije postavio: otvorite dosije
 * Slađane, a vidite tri druge osobe i nijedan podatak o njoj.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: async () => undefined }));

import { buildTopClients } from "./clientOverview";
import { Types } from "mongoose";

const SLADJANA = new Types.ObjectId();
const DESA = new Types.ObjectId();
const VERICA = new Types.ObjectId();
const KATARINA = new Types.ObjectId();

/** Oblik koji vraća agregacija: grupisano po (profileId, email). */
function row(id: Types.ObjectId, name: string, count: number) {
  return {
    _id: { profileId: id, email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com` },
    name,
    count,
  };
}

describe("buildTopClients", () => {
  it("klijent u Top 3 se prikazuje unutar Top 3, ne dopisuje se ispod", () => {
    const rows = [
      row(DESA, "Desa Jovic Bojanic", 3),
      row(SLADJANA, "Sladjana Jeremic", 2),
      row(KATARINA, "Katarina Nikolic", 1),
    ];

    const result = buildTopClients(rows, String(SLADJANA), "Sladjana Jeremic");

    expect(result).toHaveLength(3);
    expect(result.map((e) => [e.rank, e.name, e.count])).toEqual([
      [1, "Desa Jovic Bojanic", 3],
      [2, "Sladjana Jeremic", 2],
      [3, "Katarina Nikolic", 1],
    ]);
    expect(result.filter((e) => e.isViewer).map((e) => e.name)).toEqual([
      "Sladjana Jeremic",
    ]);
  });

  it("van Top 3: dopisan je cetvrtim redom, ali sa STVARNIM rednim brojem", () => {
    // Sedmoro je bookiralo, ona je osma po redu.
    const rows = [
      row(DESA, "Desa", 5),
      row(VERICA, "Verica", 4),
      row(KATARINA, "Katarina", 3),
      row(new Types.ObjectId(), "D", 3),
      row(new Types.ObjectId(), "E", 2),
      row(new Types.ObjectId(), "F", 2),
      row(new Types.ObjectId(), "G", 1),
      row(SLADJANA, "Sladjana Jeremic", 1),
    ];

    const result = buildTopClients(rows, String(SLADJANA), "Sladjana Jeremic");

    expect(result).toHaveLength(4);
    // Prva tri ostaju prva tri.
    expect(result.slice(0, 3).map((e) => e.rank)).toEqual([1, 2, 3]);
    // Cetvrti red nosi njen stvarni broj, ne "4".
    const viewer = result[3];
    expect(viewer.isViewer).toBe(true);
    expect(viewer.name).toBe("Sladjana Jeremic");
    expect(viewer.rank).toBe(8);
    expect(viewer.count).toBe(1);
  });

  it("bez ijednog termina u periodu: prikazan sa nulom, odmah iza svih koji su bookirali", () => {
    const rows = [
      row(DESA, "Desa Jovic Bojanic", 1),
      row(VERICA, "Vericaa", 1),
      row(KATARINA, "Katarina Nikolic", 1),
      row(new Types.ObjectId(), "D", 1),
      row(new Types.ObjectId(), "E", 1),
      row(new Types.ObjectId(), "F", 1),
      row(new Types.ObjectId(), "G", 1),
    ];

    const result = buildTopClients(rows, String(SLADJANA), "Sladjana Jeremic");

    const viewer = result[3];
    expect(viewer.isViewer).toBe(true);
    expect(viewer.count).toBe(0);
    // Sedmoro je bookiralo → ona je osma.
    expect(viewer.rank).toBe(8);
    // Ime dolazi iz dosijea, jer je u agregaciji nema.
    expect(viewer.name).toBe("Sladjana Jeremic");
  });

  it("izjednaceni: svi imaju po jedan termin, ona je cetvrta na listi", () => {
    const rows = [
      row(DESA, "Desa Jovic Bojanic", 1),
      row(VERICA, "Vericaa", 1),
      row(KATARINA, "Katarina Nikolic", 1),
      row(SLADJANA, "Sladjana Jeremic", 1),
    ];

    const result = buildTopClients(rows, String(SLADJANA), "Sladjana Jeremic");

    expect(result).toHaveLength(4);
    const viewer = result[3];
    expect(viewer.rank).toBe(4);
    expect(viewer.count).toBe(1);
    expect(viewer.isViewer).toBe(true);
  });

  it("prazan period: klijent je jedini red, sa nulom", () => {
    const result = buildTopClients([], String(SLADJANA), "Sladjana Jeremic");

    expect(result).toEqual([
      {
        clientId: String(SLADJANA),
        name: "Sladjana Jeremic",
        email: "",
        count: 0,
        rank: 1,
        isViewer: true,
      },
    ]);
  });

  it("tacno jedan drugi klijent: on je prvi, ona druga", () => {
    const rows = [row(DESA, "Desa", 2)];
    const result = buildTopClients(rows, String(SLADJANA), "Sladjana Jeremic");

    expect(result.map((e) => [e.rank, e.name, e.count])).toEqual([
      [1, "Desa", 2],
      [2, "Sladjana Jeremic", 0],
    ]);
  });

  it("samo jedan red je oznacen kao posmatrani klijent", () => {
    const rows = [
      row(DESA, "Desa", 3),
      row(SLADJANA, "Sladjana Jeremic", 2),
      row(KATARINA, "Katarina", 1),
      row(VERICA, "Verica", 1),
    ];
    const result = buildTopClients(rows, String(SLADJANA), "Sladjana Jeremic");
    expect(result.filter((e) => e.isViewer)).toHaveLength(1);
  });
});
