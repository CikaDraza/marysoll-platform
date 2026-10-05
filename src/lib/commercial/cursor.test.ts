import { describe, it, expect } from "vitest";
import { createCommercialCursorCodec } from "./cursor";
import { NOW, FUTURE } from "./commercial.fixtures";

const payload = { schemaVersion: 1 as const, principalKey: "principal", environment: "staging" as const,
  assignmentScopeRevision: 1, bindingScopeRevision: 1, dmdAccountId: null,
  after: "assignment-a", limit: 25, expiresAt: FUTURE };
describe("Commercial cursor integrity", () => {
  it("round trips validated cursor and rejects a different signing key", () => {
    const codec = createCommercialCursorCodec(new Uint8Array(32).fill(1));
    const token = codec.encode(payload); expect(codec.decode(token)).toEqual(payload);
    expect(createCommercialCursorCodec(new Uint8Array(32).fill(2)).decode(token)).toBeNull();
  });
  it("copies the injected key and has no short/default key fallback", () => {
    const key = new Uint8Array(32).fill(3); const codec = createCommercialCursorCodec(key);
    const token = codec.encode(payload); key.fill(4); expect(codec.decode(token)).toEqual(payload);
    expect(() => createCommercialCursorCodec(new Uint8Array(31))).toThrow();
  });
  it.each(["", "unsigned", "a.b.c", "a.!", "a.AA", "x".repeat(4097)])("rejects malformed cursor %s", (token) => {
    expect(createCommercialCursorCodec(new Uint8Array(32)).decode(token)).toBeNull();
  });
  it("rejects changed JSON even if it still has a valid shape", () => {
    const codec = createCommercialCursorCodec(new Uint8Array(32));
    const [body, signature] = codec.encode(payload).split(".");
    const changed = JSON.parse(Buffer.from(body, "base64url").toString()); changed.expiresAt = NOW.toISOString();
    expect(codec.decode(`${Buffer.from(JSON.stringify(changed)).toString("base64url")}.${signature}`)).toBeNull();
    expect(() => codec.encode({ ...payload, limit: 101 })).toThrow();
  });
});
