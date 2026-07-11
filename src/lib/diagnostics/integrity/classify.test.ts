import { describe, it, expect } from "vitest";
import {
  buildUserIndex,
  classifyUserRef,
  countOccurrences,
  groupLedgerByAccount,
  isActiveClient,
  refIssueLabel,
  type UserIndexRow,
} from "./classify";

function user(overrides: Partial<UserIndexRow> & { _id: string }): UserIndexRow {
  return {
    role: "USER",
    status: "active",
    mergedInto: null,
    ...overrides,
  };
}

describe("classifyUserRef", () => {
  const index = buildUserIndex([
    user({ _id: "aktivan" }),
    user({ _id: "spojen", status: "suspended", mergedInto: "aktivan" }),
    user({ _id: "banovan", status: "suspended" }),
  ]);

  it("zdrava referenca → null", () => {
    expect(classifyUserRef("aktivan", index)).toBeNull();
  });

  it("nepostojeći → missing", () => {
    expect(classifyUserRef("nema-ga", index)).toBe("missing");
  });

  it("merged ima prednost nad suspended (merge postavlja oba)", () => {
    expect(classifyUserRef("spojen", index)).toBe("merged");
  });

  it("suspendovan bez merge-a → suspended", () => {
    expect(classifyUserRef("banovan", index)).toBe("suspended");
  });

  it("svaki issue ima ljudski opis", () => {
    for (const issue of ["missing", "merged", "suspended"] as const) {
      expect(refIssueLabel(issue).length).toBeGreaterThan(0);
    }
  });
});

describe("isActiveClient", () => {
  it("USER/GUEST aktivni jesu; admin role, suspendovani i spojeni nisu", () => {
    expect(isActiveClient(user({ _id: "u", role: "USER" }))).toBe(true);
    expect(isActiveClient(user({ _id: "g", role: "GUEST" }))).toBe(true);
    expect(isActiveClient(user({ _id: "o", role: "OWNER" }))).toBe(false);
    expect(
      isActiveClient(user({ _id: "s", status: "suspended" })),
    ).toBe(false);
    expect(
      isActiveClient(user({ _id: "m", status: "suspended", mergedInto: "u" })),
    ).toBe(false);
  });
});

describe("groupLedgerByAccount", () => {
  it("grupiše redove po accountId, čuva redosled", () => {
    const rows = [
      { accountId: "a1", currency: "hearts", amount: 1 },
      { accountId: "a2", currency: "points", amount: 10 },
      { accountId: "a1", currency: "points", amount: -5 },
    ];
    const groups = groupLedgerByAccount(rows);
    expect(groups.get("a1")).toHaveLength(2);
    expect(groups.get("a2")).toHaveLength(1);
    expect(groups.get("a1")![1].amount).toBe(-5);
  });
});

describe("countOccurrences", () => {
  it("broji pojave po ključu", () => {
    const counts = countOccurrences(["a", "b", "a", "a"]);
    expect(counts.get("a")).toBe(3);
    expect(counts.get("b")).toBe(1);
    expect(counts.get("c")).toBeUndefined();
  });
});
