import {
  hasGuestBookingContact,
  hasRegistrationContact,
  inferPreferredContact,
  normalizeInstagram,
} from "./contactRules";

describe("contact rules", () => {
  it("allows registration with email + phone contact", () => {
    expect(hasRegistrationContact({ phone: "0601234567" })).toBe(true);
  });

  it("allows registration with email + instagram contact", () => {
    expect(hasRegistrationContact({ instagram: "@ana" })).toBe(true);
    expect(normalizeInstagram("@ana")).toBe("ana");
  });

  it("rejects registration with email only and no phone/instagram", () => {
    expect(hasRegistrationContact({})).toBe(false);
  });

  it("allows authenticated appointment contact fallback to platform", () => {
    expect(inferPreferredContact({ fallback: "platform" })).toBe("platform");
  });

  it("allows guest appointment with phone only", () => {
    expect(hasGuestBookingContact({ phone: "0601234567" })).toBe(true);
  });

  it("allows guest appointment with instagram only", () => {
    expect(hasGuestBookingContact({ instagram: "@ana" })).toBe(true);
    expect(inferPreferredContact({ instagram: "@ana" })).toBe("instagram");
  });

  it("allows guest appointment with email only", () => {
    expect(hasGuestBookingContact({ email: "ana@example.com" })).toBe(true);
    expect(inferPreferredContact({ email: "ana@example.com" })).toBe("email");
  });

  it("rejects guest appointment without phone/email/instagram", () => {
    expect(hasGuestBookingContact({})).toBe(false);
  });
});
