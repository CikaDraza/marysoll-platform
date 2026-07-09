import { describe, it, expect } from "vitest";
import { groupDuplicatesByPhone } from "./groupDuplicates";

interface Row {
  _id: string;
  role: string;
  phone?: string;
}

describe("groupDuplicatesByPhone", () => {
  it("flaguje gost + registrovani sa istim telefonom (različit format)", () => {
    const rows: Row[] = [
      { _id: "a", role: "USER", phone: "+381601234567" },
      { _id: "b", role: "GUEST", phone: "060 123 4567" },
    ];
    const groups = groupDuplicatesByPhone(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].accounts.map((a) => a._id).sort()).toEqual(["a", "b"]);
  });

  it("ne flaguje grupu bez gosta (dva registrovana)", () => {
    const rows: Row[] = [
      { _id: "a", role: "USER", phone: "+381601234567" },
      { _id: "b", role: "USER", phone: "0601234567" },
    ];
    expect(groupDuplicatesByPhone(rows)).toHaveLength(0);
  });

  it("ne flaguje usamljen nalog (samo jedan po telefonu)", () => {
    const rows: Row[] = [{ _id: "a", role: "GUEST", phone: "+381601234567" }];
    expect(groupDuplicatesByPhone(rows)).toHaveLength(0);
  });

  it("preskače naloge bez telefona (ne mogu se pouzdano spojiti)", () => {
    const rows: Row[] = [
      { _id: "a", role: "USER", phone: "" },
      { _id: "b", role: "GUEST", phone: undefined },
    ];
    expect(groupDuplicatesByPhone(rows)).toHaveLength(0);
  });

  it("razdvaja različite telefone u zasebne grupe", () => {
    const rows: Row[] = [
      { _id: "a", role: "USER", phone: "+381601111111" },
      { _id: "b", role: "GUEST", phone: "0601111111" },
      { _id: "c", role: "USER", phone: "+381602222222" },
      { _id: "d", role: "GUEST", phone: "0602222222" },
    ];
    const groups = groupDuplicatesByPhone(rows);
    expect(groups).toHaveLength(2);
    for (const g of groups) expect(g.accounts).toHaveLength(2);
  });

  it("grupiše tri naloga (2 gosta + registrovani) na isti telefon", () => {
    const rows: Row[] = [
      { _id: "a", role: "USER", phone: "+381601234567" },
      { _id: "b", role: "GUEST", phone: "060 123 4567" },
      { _id: "c", role: "GUEST", phone: "0601234567" },
    ];
    const groups = groupDuplicatesByPhone(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].accounts).toHaveLength(3);
  });
});
